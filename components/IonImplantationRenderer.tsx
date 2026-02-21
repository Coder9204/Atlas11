import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed';
  gameType: string;
  gameTitle: string;
  details: {
    currentScreen?: number;
    totalScreens?: number;
    phase?: string;
    phaseLabel?: string;
    prediction?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    needsHelp?: boolean;
    [key: string]: unknown;
  };
  timestamp: number;
}

interface IonImplantationRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  silicon: '#4a5568',
  dopant: '#3b82f6',
  ion: '#8b5cf6',
  crystal: '#10b981',
  border: '#334155',
  primary: '#06b6d4',
};

// --- GLOBAL SOUND UTILITY ---
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
      complete: { freq: 900, duration: 0.4, type: 'sine' }
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

const IonImplantationRenderer: React.FC<IonImplantationRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Transfer app state
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  // --- INTERNAL PHASE STATE MANAGEMENT ---
  type IonPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: IonPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  // Use gamePhase from props if valid, otherwise default to 'hook'
  const getInitialPhase = (): IonPhase => {
    if (gamePhase && validPhases.includes(gamePhase as IonPhase)) {
      return gamePhase as IonPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<IonPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as IonPhase) && gamePhase !== phase) {
      setPhase(gamePhase as IonPhase);
    }
  }, [gamePhase]);

  // Phase order for navigation
  const phaseOrder: IonPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<IonPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Emit events to AI coach
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'ion_implantation',
        gameTitle: 'Ion Implantation',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((p: IonPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    playSound('transition');

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `Navigated to ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phaseLabels, phaseOrder]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Simulation state
  const [ionEnergy, setIonEnergy] = useState(50); // keV
  const [doseExponent, setDoseExponent] = useState(15); // 10^14 to 10^16 ions/cm^2
  const [annealTemp, setAnnealTemp] = useState(600); // Celsius
  const [annealTime, setAnnealTime] = useState(30); // seconds
  const [crystalOrientation, setCrystalOrientation] = useState<'100' | '110' | '111'>('100');
  const [showChanneling, setShowChanneling] = useState(false);
  const [isImplanting, setIsImplanting] = useState(false);
  const [isAnnealing, setIsAnnealing] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
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

  // Physics calculations
  const calculateImplantProfile = useCallback(() => {
    // LSS theory approximation for implant range
    // Range (Rp) roughly proportional to E^0.7 for typical dopants
    const baseRange = 10; // nm at 10 keV
    const projectedRange = baseRange * Math.pow(ionEnergy / 10, 0.7); // nm

    // Straggle (delta Rp) roughly 0.4 * Rp
    const straggle = projectedRange * 0.4;

    // Channeling effect - ions can travel much deeper in aligned crystals
    const channelingFactor = showChanneling ?
      (crystalOrientation === '110' ? 2.5 : crystalOrientation === '100' ? 1.8 : 1.2) : 1;

    const effectiveRange = projectedRange * channelingFactor;

    // Anneal diffusion - Fick's law
    // Diffusion length = sqrt(D * t), D = D0 * exp(-Ea/kT)
    const activationEnergy = 3.5; // eV for dopants in Si
    const kT = 8.617e-5 * (annealTemp + 273); // eV
    const D0 = 1e7; // nm^2/s
    const diffusivity = D0 * Math.exp(-activationEnergy / kT);
    const diffusionLength = Math.sqrt(diffusivity * annealTime);

    // Post-anneal profile is broader
    const postAnnealStraggle = Math.sqrt(straggle * straggle + 2 * diffusionLength * diffusionLength);

    // Junction depth (where concentration falls to ~1e17)
    const junctionDepth = effectiveRange + 3 * postAnnealStraggle;

    // Damage level (arbitrary units)
    const damageLevel = (ionEnergy / 100) * Math.pow(10, doseExponent - 14) * 100;

    // Activation percentage (depends on anneal)
    const activation = Math.min(100, 100 * (1 - Math.exp(-annealTime / 30)) * (annealTemp / 1000));

    return {
      projectedRange: effectiveRange,
      straggle,
      postAnnealStraggle,
      junctionDepth,
      damageLevel: Math.min(100, damageLevel),
      activation: Math.min(100, activation),
      diffusionLength,
    };
  }, [ionEnergy, doseExponent, annealTemp, annealTime, crystalOrientation, showChanneling]);

  const predictions = [
    { id: 'linear', label: 'Higher energy means deeper implant - linear relationship' },
    { id: 'sqrt', label: 'Depth increases with energy, but slows down (square root relationship)' },
    { id: 'constant', label: 'Depth is mostly constant - ions stop at the crystal surface' },
    { id: 'random', label: 'Depth is random - ions scatter unpredictably' },
  ];

  const twistPredictions = [
    { id: 'no_effect', label: 'Crystal orientation has no effect - silicon is silicon' },
    { id: 'channeling', label: 'Some orientations allow ions to travel much deeper (channeling)' },
    { id: 'reflection', label: 'Some orientations reflect the ions back' },
    { id: 'damage', label: 'Different orientations cause different damage patterns' },
  ];

  const transferApplications = [
    {
      title: 'CMOS Well Formation',
      description: 'Modern CMOS processes use deep implants to form n-wells and p-wells that isolate transistors.',
      question: 'Why are high-energy implants (MeV) used for retrograde wells?',
      answer: 'Retrograde wells have peak doping below the surface, which reduces latch-up susceptibility. High-energy implants place the peak deep in the silicon, then a lower-energy implant sets the surface concentration.',
    },
    {
      title: 'Source/Drain Engineering',
      description: 'Ultra-shallow junctions (<10nm) are critical for short-channel transistors.',
      question: 'How do you create junctions shallower than the implant range?',
      answer: 'Use very low energy (<1 keV), heavy ions (like arsenic), and rapid thermal annealing (RTA) to minimize diffusion. Pre-amorphization implants can also limit channeling.',
    },
    {
      title: 'Threshold Voltage Adjustment',
      description: 'Precise doping near the gate controls the voltage at which a transistor turns on.',
      question: 'Why is dose control (rather than energy) critical for Vth implants?',
      answer: 'The threshold voltage shifts proportionally to the integrated dopant concentration under the gate. A 10% dose variation causes measurable Vth shift, affecting circuit speed and power.',
    },
    {
      title: 'Power Devices',
      description: 'High-voltage transistors need carefully graded doping profiles to spread electric fields.',
      question: 'How do multiple implants at different energies create a graded profile?',
      answer: 'Each implant energy creates a Gaussian peak at a different depth. By overlapping multiple implants, the total profile becomes a smooth, graded transition that optimizes breakdown voltage.',
    },
  ];

  const testQuestions = [
    {
      question: 'What primarily determines the depth of ion implantation in silicon?',
      options: [
        { text: 'Ion beam current', correct: false },
        { text: 'Ion energy (keV)', correct: true },
        { text: 'Implant time', correct: false },
        { text: 'Substrate temperature', correct: false },
      ],
    },
    {
      question: 'The Gaussian distribution of implanted ions is characterized by:',
      options: [
        { text: 'Projected range (Rp) and straggle (delta Rp)', correct: true },
        { text: 'Dose and beam current', correct: false },
        { text: 'Wafer rotation speed', correct: false },
        { text: 'Vacuum pressure', correct: false },
      ],
    },
    {
      question: 'Channeling occurs when:',
      options: [
        { text: 'The ion beam is too intense', correct: false },
        { text: 'Ions travel along crystal lattice channels with less scattering', correct: true },
        { text: 'The wafer is heated during implant', correct: false },
        { text: 'Multiple ion species are used', correct: false },
      ],
    },
    {
      question: 'Post-implant annealing is necessary to:',
      options: [
        { text: 'Increase the implant dose', correct: false },
        { text: 'Repair crystal damage and activate dopants', correct: true },
        { text: 'Remove the photoresist mask', correct: false },
        { text: 'Reduce the implant depth', correct: false },
      ],
    },
    {
      question: 'Higher anneal temperatures cause:',
      options: [
        { text: 'Shallower junctions due to ion evaporation', correct: false },
        { text: 'Broader profiles due to increased diffusion', correct: true },
        { text: 'No change to the profile', correct: false },
        { text: 'Sharper profiles due to better activation', correct: false },
      ],
    },
    {
      question: 'To create ultra-shallow junctions, you should:',
      options: [
        { text: 'Use high energy and long anneal times', correct: false },
        { text: 'Use low energy, heavy ions, and rapid thermal anneal', correct: true },
        { text: 'Use high dose to saturate the surface', correct: false },
        { text: 'Implant at high temperature', correct: false },
      ],
    },
    {
      question: 'The junction depth is defined where:',
      options: [
        { text: 'The implanted concentration equals zero', correct: false },
        { text: 'The implanted concentration equals the background doping', correct: true },
        { text: 'The implant damage is maximum', correct: false },
        { text: 'The crystal structure is perfect', correct: false },
      ],
    },
    {
      question: 'Pre-amorphization implants are used to:',
      options: [
        { text: 'Increase the implant dose', correct: false },
        { text: 'Prevent channeling by destroying the crystal structure', correct: true },
        { text: 'Reduce wafer cost', correct: false },
        { text: 'Improve beam uniformity', correct: false },
      ],
    },
    {
      question: 'Dopant activation refers to:',
      options: [
        { text: 'The ions entering the silicon', correct: false },
        { text: 'Dopants occupying substitutional lattice sites', correct: true },
        { text: 'The implant beam turning on', correct: false },
        { text: 'The wafer loading process', correct: false },
      ],
    },
    {
      question: 'The trade-off in anneal optimization is:',
      options: [
        { text: 'Cost vs. throughput only', correct: false },
        { text: 'Higher activation vs. more diffusion (profile broadening)', correct: true },
        { text: 'Beam current vs. uniformity', correct: false },
        { text: 'Temperature vs. vacuum pressure', correct: false },
      ],
    },
  ];

  const realWorldApps = [
    {
      icon: 'Cpu',
      title: 'Transistor Doping',
      short: 'Creating billions of transistors with atomic precision',
      tagline: 'The foundation of modern computing',
      description: 'Ion implantation is the primary method for introducing dopant atoms into silicon to create the p-type and n-type regions that form transistors. Every microprocessor contains billions of transistors, each requiring precisely controlled doping profiles achieved through ion implantation.',
      connection: 'The energy-depth relationship you explored determines exactly where dopants end up in each transistor. Too shallow and the transistor leaks; too deep and it switches slowly.',
      howItWorks: 'Phosphorus or arsenic ions create n-type regions (extra electrons), while boron ions create p-type regions (electron holes). Multiple implants at different energies build up complex doping profiles for source, drain, and channel regions.',
      stats: [
        { value: '100B+', label: 'Transistors per chip' },
        { value: '<5nm', label: 'Junction depth' },
        { value: '0.1%', label: 'Dose uniformity' },
      ],
      examples: [
        'Source/drain extension implants for short-channel control',
        'Halo implants to prevent punch-through',
        'Well implants for CMOS isolation',
        'Threshold voltage adjustment implants',
      ],
      companies: ['Intel', 'TSMC', 'Samsung', 'GlobalFoundries', 'Applied Materials'],
      futureImpact: 'As transistors shrink below 3nm, ion implantation faces challenges from statistical dopant fluctuation. Advanced techniques like plasma doping and molecular beam implants are extending the technology to atomic-scale precision.',
      color: '#3b82f6',
    },
    {
      icon: 'Heart',
      title: 'Medical Device Coatings',
      short: 'Making implants that the body accepts',
      tagline: 'Biocompatibility through surface engineering',
      description: 'Ion implantation modifies the surface properties of medical implants like artificial joints, stents, and dental implants. By implanting nitrogen, oxygen, or carbon ions, manufacturers create surfaces that are harder, more wear-resistant, and better accepted by human tissue.',
      connection: 'The same physics that controls dopant depth in silicon controls how deep surface modifications penetrate in titanium and other biomedical materials.',
      howItWorks: 'High-energy ions penetrate the implant surface, creating a modified layer that transitions gradually to the bulk material. This graded interface prevents coating delamination while providing improved surface properties.',
      stats: [
        { value: '500%', label: 'Wear resistance increase' },
        { value: '20+', label: 'Year implant lifetime' },
        { value: '95%', label: 'Reduced bacterial adhesion' },
      ],
      examples: [
        'Hip and knee replacement bearing surfaces',
        'Coronary stents with anti-thrombogenic coatings',
        'Dental implants with improved osseointegration',
        'Surgical instruments with antimicrobial surfaces',
      ],
      companies: ['Zimmer Biomet', 'Stryker', 'Medtronic', 'Boston Scientific'],
      futureImpact: 'Next-generation implants will use ion implantation to create smart surfaces that release drugs on demand, prevent infection, and actively promote tissue integration through engineered surface chemistry.',
      color: '#ef4444',
    },
    {
      icon: 'Wrench',
      title: 'Tool Hardening',
      short: 'Making cutting tools last 10x longer',
      tagline: 'Industrial surface engineering',
      description: 'Ion implantation transforms the surfaces of cutting tools, dies, and molds by implanting nitrogen, carbon, or metal ions. The modified surface layer becomes extremely hard and wear-resistant while the bulk material retains its toughness.',
      connection: 'The projected range and straggle concepts apply to metals just as they do to silicon. Controlling implant depth creates optimal hardness profiles for different applications.',
      howItWorks: 'Nitrogen ions implanted into steel form hard nitride precipitates in the surface layer. The gradual concentration profile prevents the sharp interface that would cause coating failure under stress.',
      stats: [
        { value: '10x', label: 'Tool life extension' },
        { value: '80%', label: 'Friction reduction' },
        { value: '3x', label: 'Surface hardness increase' },
      ],
      examples: [
        'Precision injection mold surfaces',
        'High-speed steel cutting tools',
        'Stamping dies for automotive parts',
        'Extrusion dies for aluminum processing',
      ],
      companies: ['Bodycote', 'Ionbond', 'Oerlikon Balzers', 'Praxair Surface Technologies', 'Kennametal'],
      futureImpact: 'Hybrid treatments combining ion implantation with coating technologies are enabling tools that operate at higher speeds and temperatures, reducing manufacturing energy consumption and enabling new material processing capabilities.',
      color: '#f59e0b',
    },
    {
      icon: 'Sun',
      title: 'Solar Cell Manufacturing',
      short: 'Capturing more sunlight with precision doping',
      tagline: 'Powering the renewable energy revolution',
      description: 'Ion implantation creates the p-n junctions in solar cells that convert sunlight to electricity. Precise control over doping profiles maximizes the number of photogenerated carriers that reach the contacts, directly increasing cell efficiency.',
      connection: 'The junction depth and doping profile concepts you learned determine how effectively a solar cell captures photons at different wavelengths and collects the resulting charge carriers.',
      howItWorks: 'Phosphorus implantation creates the n-type emitter layer on p-type silicon wafers. The implant energy sets the junction depth, optimizing the trade-off between blue response (shallow junction) and carrier collection (deeper junction).',
      stats: [
        { value: '26%+', label: 'Record cell efficiency' },
        { value: '1TW', label: 'Annual production capacity' },
        { value: '$0.02', label: 'Per watt processing cost' },
      ],
      examples: [
        'Emitter formation in crystalline silicon cells',
        'Back surface field implants for passivation',
        'Selective emitter patterns for reduced recombination',
        'Interdigitated back contact cell fabrication',
      ],
      companies: ['LONGi', 'JinkoSolar', 'Canadian Solar', 'First Solar', 'Meyer Burger'],
      futureImpact: 'Advanced cell architectures like heterojunction and TOPCon designs use ion implantation to create ultra-thin, highly doped contact layers that are pushing commercial cell efficiencies above 25% while reducing material usage.',
      color: '#10b981',
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
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  // --- PROGRESS BAR COMPONENT ---
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
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '8px' : '12px',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '6px 12px',
            minHeight: '44px',
            borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            background: currentIdx > 0 ? colors.bgDark : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '3px' : '4px' }} role="tablist" aria-label="Phase navigation">
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                role="tab"
                aria-selected={i === currentIdx}
                aria-label={`Phase ${i + 1}: ${phaseLabels[p]}`}
                data-phase={p}
                data-nav-dot="true"
                onClick={() => i <= currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '8px' : '8px',
                  width: i === currentIdx ? (isMobile ? '16px' : '20px') : (isMobile ? '8px' : '8px'),
                  borderRadius: '50%',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: colors.textSecondary }}>
            {currentIdx + 1}/{phaseOrder.length}
          </span>
        </div>

        {/* Phase Label */}
        <div style={{
          padding: '4px 10px',
          borderRadius: '10px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '10px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // --- BOTTOM NAVIGATION BAR ---
  const renderBottomBar = (canGoNext: boolean, nextLabel: string) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgDark,
        gap: '12px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: isMobile ? '10px 16px' : '12px 20px',
            minHeight: '44px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCard,
            color: canBack ? colors.textSecondary : colors.textMuted,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.4,
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '12px 24px',
            minHeight: '44px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent}, ${colors.warning})` : colors.bgCard,
            color: canGoNext ? 'white' : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.5,
            transition: 'all 0.2s ease',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = (interactive: boolean, showChannelingEffect: boolean = false) => {
    const width = 500;
    const height = 400;
    const profile = calculateImplantProfile();

    // Generate concentration profile points
    const profilePoints: { x: number; y: number }[] = [];
    const maxDepth = 300; // nm
    for (let depth = 0; depth <= maxDepth; depth += 5) {
      const rp = profile.projectedRange;
      const sigma = isAnnealing ? profile.postAnnealStraggle : profile.straggle;
      // Gaussian profile
      const concentration = Math.exp(-Math.pow(depth - rp, 2) / (2 * sigma * sigma));
      profilePoints.push({ x: 50 + (depth / maxDepth) * 350, y: 300 - concentration * 200 });
    }

    // Path for profile curve
    const profilePath = profilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Ion beam particles
    const ions = [];
    if (isImplanting || interactive) {
      for (let i = 0; i < 15; i++) {
        const startY = 20 + Math.random() * 40;
        const endY = 100 + profile.projectedRange * 0.5 + (Math.random() - 0.5) * profile.straggle * 0.8;
        ions.push(
          <line
            key={`ion${i}`}
            x1={250 + (Math.random() - 0.5) * 60}
            y1={startY}
            x2={250 + (Math.random() - 0.5) * 80}
            y2={endY}
            stroke={colors.ion}
            strokeWidth={2}
            opacity={0.7}
            strokeDasharray="4,4"
          >
            <animate
              attributeName="y1"
              values={`${startY};${endY};${startY}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
        );
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
         role="img" aria-label="Ion Implantation visualization">
          <defs>
            <linearGradient id="siliconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="profileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.dopant} />
              <stop offset="100%" stopColor={colors.ion} />
            </linearGradient>
            <radialGradient id="ionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.ion} stopOpacity="1" />
              <stop offset="100%" stopColor={colors.ion} stopOpacity="0" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background layer group */}
          <g id="backgroundLayer">
            {/* Ion beam source */}
            <rect x={200} y={5} width={100} height={30} fill="#4b5563" rx={4} filter="url(#softShadow)" />
            <text x={250} y={22} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              Ion Beam ({ionEnergy} keV)
            </text>

            {/* Ion beam cone */}
            <polygon points="220,35 280,35 300,80 200,80" fill="rgba(139, 92, 246, 0.3)" />
          </g>

          {/* Ion particles layer group */}
          <g id="ionLayer" filter="url(#glow)">
            {ions}
          </g>

          {/* Silicon wafer layer group */}
          <g id="waferLayer">
            {/* Silicon wafer cross-section */}
            <rect x={50} y={80} width={400} height={220} fill="url(#siliconGrad)" stroke={colors.silicon} strokeWidth={2} />

            {/* Crystal lattice pattern (if showing channeling) */}
            {showChannelingEffect && (
              <g opacity={0.3}>
                {Array.from({ length: 20 }).map((_, i) =>
                  Array.from({ length: 11 }).map((_, j) => (
                    <circle
                      key={`atom${i}${j}`}
                      cx={60 + i * 20}
                      cy={85 + j * 20}
                      r={3}
                      fill={colors.crystal}
                    />
                  ))
                )}
                {crystalOrientation === '110' && (
                  <line x1={250} y1={80} x2={250} y2={300} stroke={colors.accent} strokeWidth={2} strokeDasharray="5,5" />
                )}
              </g>
            )}
          </g>

          {/* Profile layer group */}
          <g id="profileLayer">
            {/* Implant profile plot */}
            <text x={250} y={330} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
              Depth (nm) - {Math.round(profile.junctionDepth)} nm junction
            </text>

            {/* Profile background */}
            <rect x={50} y={100} width={350} height={200} fill="rgba(0,0,0,0.4)" rx={4} />

            {/* Concentration scale */}
            <text x={45} y={110} fill={colors.textSecondary} fontSize={11} textAnchor="end">High</text>
            <text x={45} y={290} fill={colors.textSecondary} fontSize={11} textAnchor="end">Low</text>

            {/* Profile curve */}
            <path
              d={profilePath}
              fill="none"
              stroke="url(#profileGrad)"
              strokeWidth={3}
              filter="url(#glow)"
            />

            {/* Fill under curve */}
            <path
              d={`${profilePath} L 400 300 L 50 300 Z`}
              fill={isAnnealing ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}
            />

            {/* Peak marker */}
            <circle
              cx={50 + (profile.projectedRange / 300) * 350}
              cy={100}
              r={5}
              fill={colors.accent}
              filter="url(#glow)"
            />
            <text
              x={50 + (profile.projectedRange / 300) * 350}
              y={95}
              fill={colors.accent}
              fontSize={11}
              textAnchor="middle"
            >
              Rp={Math.round(profile.projectedRange)}nm
            </text>
          </g>

          {/* Info panel layer group */}
          <g id="infoLayer">
            <rect x={10} y={340} width={200} height={55} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
            <text x={20} y={355} fill={colors.textSecondary} fontSize={11}>
              Dose: 10^{doseExponent} ions/cm2
            </text>
            <text x={20} y={370} fill={colors.textSecondary} fontSize={11}>
              Damage: {Math.round(profile.damageLevel)}%
            </text>
            <text x={20} y={387} fill={colors.success} fontSize={11}>
              Activation: {Math.round(profile.activation)}%
            </text>

            {/* Anneal status */}
            {isAnnealing && (
              <rect x={290} y={340} width={150} height={55} fill="rgba(16, 185, 129, 0.2)" rx={8} stroke={colors.success} strokeWidth={1}>
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
              </rect>
            )}
            <text x={300} y={355} fill={isAnnealing ? colors.success : colors.textMuted} fontSize={11}>
              Anneal: {annealTemp}C
            </text>
            <text x={300} y={370} fill={isAnnealing ? colors.success : colors.textMuted} fontSize={11}>
              Time: {annealTime}s
            </text>
            <text x={300} y={387} fill={isAnnealing ? colors.success : colors.textMuted} fontSize={11}>
              Diffusion: {profile.diffusionLength.toFixed(1)}nm
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsImplanting(!isImplanting); setIsAnnealing(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isImplanting ? colors.ion : colors.dopant,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isImplanting ? 'Stop Implant' : 'Start Implant'}
            </button>
            <button
              onClick={() => { setIsAnnealing(!isAnnealing); setIsImplanting(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnnealing ? colors.success : colors.warning,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isAnnealing ? 'Stop Anneal' : 'Start Anneal'}
            </button>
            <button
              onClick={() => { setIonEnergy(50); setDoseExponent(14); setAnnealTemp(600); setAnnealTime(30); setIsImplanting(false); setIsAnnealing(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  // Slider styling for visibility
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    cursor: 'pointer',
    accentColor: '#3b82f6',
    touchAction: 'pan-y' as const,
  };

  const renderControls = (showChannelingControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Ion Energy: <span style={{ color: colors.accent, fontWeight: 700 }}>{ionEnergy} keV</span>
        </label>
        <input
          type="range"
          min="5"
          max="200"
          step="5"
          value={ionEnergy}
          onChange={(e) => setIonEnergy(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Dose: <span style={{ color: colors.accent, fontWeight: 700 }}>10^{doseExponent} ions/cm2</span>
        </label>
        <input
          type="range"
          min="12"
          max="16"
          step="0.5"
          value={doseExponent}
          onChange={(e) => setDoseExponent(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Anneal Temperature: <span style={{ color: colors.accent, fontWeight: 700 }}>{annealTemp}C</span>
        </label>
        <input
          type="range"
          min="400"
          max="1100"
          step="50"
          value={annealTemp}
          onChange={(e) => setAnnealTemp(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Anneal Time: <span style={{ color: colors.accent, fontWeight: 700 }}>{annealTime} seconds</span>
        </label>
        <input
          type="range"
          min="1"
          max="120"
          step="1"
          value={annealTime}
          onChange={(e) => setAnnealTime(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {showChannelingControls && (
        <>
          <div>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
              Crystal Orientation
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['100', '110', '111'] as const).map((orient) => (
                <button
                  key={orient}
                  onClick={() => setCrystalOrientation(orient)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: crystalOrientation === orient ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: crystalOrientation === orient ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                  }}
                >
                  ({orient})
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showChanneling}
                onChange={(e) => setShowChanneling(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Channeling Effect
            </label>
          </div>
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Rp = {calculateImplantProfile().projectedRange.toFixed(1)} nm |
          Delta Rp = {calculateImplantProfile().straggle.toFixed(1)} nm
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Junction: {calculateImplantProfile().junctionDepth.toFixed(1)} nm
        </div>
      </div>
    </div>
  );

  // Emit initial game_started event on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      emitGameEvent('game_started', {
        phase: 'hook',
        phaseLabel: 'Introduction',
        currentScreen: 1,
        totalScreens: phaseOrder.length,
        message: 'Ion Implantation game started'
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // --- RENDER PHASES ---

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
              Ion Implantation
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              How do you add dopants precisely without ruining the crystal?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Creating a transistor requires placing precise amounts of dopant atoms at exact depths
                in the silicon crystal. Ion implantation shoots high-energy ions into the wafer,
                but how do you control where they stop? And how do you fix the damage they cause?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                Try adjusting the ion energy and watch how the implant depth changes!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const selectedCount = prediction ? 1 : 0;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              An ion implanter shoots accelerated dopant ions (like phosphorus or boron) into a silicon
              wafer. The concentration profile shows how many dopant atoms end up at each depth.
              The peak is called the projected range (Rp).
            </p>
          </div>

          {/* Progress indicator */}
          <div style={{ padding: '0 16px 8px 16px', textAlign: 'center' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Progress: {selectedCount} of 1 selection made
            </span>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does ion energy affect implant depth?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? `linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))` : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore Ion Implantation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Adjust energy, dose, and anneal parameters to shape the dopant profile
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          {/* Real-world relevance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `4px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Real-World Application:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
              This exact simulation models how engineers at Intel, TSMC, and Samsung design transistors.
              Every smartphone and computer chip relies on precise ion implantation to create billions of transistors.
              The parameters you are adjusting determine transistor speed, power consumption, and reliability.
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `4px solid ${colors.primary}`,
          }}>
            <h4 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Observation Guide:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
              Watch how the dopant concentration profile changes as you adjust parameters.
              Notice the relationship between ion energy and implant depth.
              Observe how annealing affects the profile width and junction depth.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontWeight: 400 }}>
              <li>Increase energy from 10 to 200 keV - how does the profile shift?</li>
              <li>Try annealing at 600C vs 1000C - watch the profile broaden</li>
              <li>Compare short (10s) vs long (120s) anneal times</li>
              <li>Note: higher dose increases damage that needs repair!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // Review phase SVG diagram
  const renderReviewDiagram = () => (
    <svg width="100%" height="200" viewBox="0 0 400 200" style={{ margin: '0 auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="reviewGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.dopant} />
          <stop offset="100%" stopColor={colors.ion} />
        </linearGradient>
        <filter id="reviewGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g id="reviewDiagramLayer">
        {/* Energy axis */}
        <line x1="50" y1="170" x2="350" y2="170" stroke={colors.textSecondary} strokeWidth="2" />
        <text x="200" y="195" fill={colors.textSecondary} fontSize="12" textAnchor="middle" style={{ fontWeight: 400 }}>Ion Energy (keV)</text>

        {/* Depth axis */}
        <line x1="50" y1="170" x2="50" y2="30" stroke={colors.textSecondary} strokeWidth="2" />
        <text x="25" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform="rotate(-90, 25, 100)" style={{ fontWeight: 400 }}>Depth (nm)</text>

        {/* E^0.7 curve */}
        <path
          d="M 60 160 Q 150 100, 200 80 Q 280 50, 340 40"
          fill="none"
          stroke="url(#reviewGrad)"
          strokeWidth="3"
          filter="url(#reviewGlow)"
        />

        {/* Data points */}
        <circle cx="100" cy="130" r="5" fill={colors.accent} />
        <circle cx="150" cy="100" r="5" fill={colors.accent} />
        <circle cx="200" cy="80" r="5" fill={colors.accent} />
        <circle cx="250" cy="65" r="5" fill={colors.accent} />
        <circle cx="300" cy="50" r="5" fill={colors.accent} />

        {/* Label */}
        <text x="280" y="90" fill={colors.accent} fontSize="11" style={{ fontWeight: 700 }}>Rp ~ E^0.7</text>
      </g>
    </svg>
  );

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'sqrt';
    const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>
              Your prediction: {userPredictionLabel}
            </p>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              Implant depth (projected range) increases with energy, but follows a sub-linear relationship.
              According to LSS theory, Rp scales roughly as E^0.7 for typical dopants in silicon.
            </p>
          </div>

          {/* Visual diagram for review */}
          <div style={{ margin: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', textAlign: 'center', fontWeight: 700 }}>Energy vs Depth Relationship</h4>
            {renderReviewDiagram()}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The Physics of Ion Implantation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>LSS Theory:</strong> The Lindhard-Scharff-Schiott
                model predicts ion stopping in solids. Ions lose energy through nuclear (collisions) and
                electronic (ionization) stopping.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Gaussian Profile:</strong> The implant distribution
                is roughly Gaussian with mean Rp (projected range) and standard deviation Delta Rp (straggle).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Crystal Damage:</strong> Each ion creates a cascade
                of displaced silicon atoms. Higher doses create more damage that must be repaired.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Annealing:</strong> Thermal treatment repairs the
                crystal and "activates" dopants by moving them to substitutional lattice sites. But diffusion
                also broadens the profile!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if the silicon crystal orientation matters?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Silicon has a diamond cubic crystal structure with open "channels" along certain
              directions. The (100), (110), and (111) crystal orientations have different
              atomic arrangements when viewed from above.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does crystal orientation affect ion implantation?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Channeling</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle channeling and change crystal orientation to see the effect
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The (110) direction has the most open channels, allowing ions to travel 2-3x deeper!
              This is called channeling - ions "thread" between atomic rows with less scattering.
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // Twist review SVG diagram
  const renderTwistReviewDiagram = () => (
    <svg width="100%" height="180" viewBox="0 0 400 180" style={{ margin: '0 auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="channelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.warning} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>
        <filter id="channelGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g id="twistDiagramLayer">
        {/* Crystal lattice representation */}
        {Array.from({ length: 8 }).map((_, i) =>
          Array.from({ length: 6 }).map((_, j) => (
            <circle
              key={`latom${i}${j}`}
              cx={50 + i * 25}
              cy={30 + j * 25}
              r={6}
              fill={colors.crystal}
              opacity={0.6}
            />
          ))
        )}

        {/* Channel path */}
        <path
          d="M 125 10 L 125 170"
          stroke="url(#channelGrad)"
          strokeWidth="4"
          strokeDasharray="8,4"
          filter="url(#channelGlow)"
        />

        {/* Ion arrow */}
        <polygon points="125,15 120,30 125,25 130,30" fill={colors.ion} />

        {/* Labels */}
        <text x="280" y="50" fill={colors.textPrimary} fontSize="12" style={{ fontWeight: 700 }}>(110) Channel</text>
        <text x="280" y="70" fill={colors.textSecondary} fontSize="11" style={{ fontWeight: 400 }}>Ions travel 2-3x deeper</text>
        <text x="280" y="110" fill={colors.warning} fontSize="12" style={{ fontWeight: 700 }}>Channeling Effect</text>
        <text x="280" y="130" fill={colors.textSecondary} fontSize="11" style={{ fontWeight: 400 }}>Less scattering in</text>
        <text x="280" y="148" fill={colors.textSecondary} fontSize="11" style={{ fontWeight: 400 }}>aligned directions</text>
      </g>
    </svg>
  );

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'channeling';
    const userTwistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>
              Your prediction: {userTwistPredictionLabel}
            </p>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              Channeling allows ions to penetrate much deeper when aligned with crystal channels.
              The (110) direction in silicon has the most open channels.
            </p>
          </div>

          {/* Visual diagram for twist review */}
          <div style={{ margin: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px' }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px', textAlign: 'center', fontWeight: 700 }}>Crystal Channeling Mechanism</h4>
            {renderTwistReviewDiagram()}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontWeight: 700 }}>Channeling in Practice</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Channel Structure:</strong> Silicon's diamond
                lattice has open channels along certain crystallographic directions. Ions traveling down
                these channels experience only glancing collisions, losing energy slowly.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Preventing Channeling:</strong> For controlled
                implants, wafers are tilted 7 degrees off-axis and rotated. This ensures ions hit atoms early,
                preventing deep channeling tails.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Pre-Amorphization:</strong> For ultra-shallow
                junctions, a silicon or germanium implant first destroys the crystal structure, eliminating
                channels before the dopant implant.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Ion Implantation"
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
    const currentApp = realWorldApps[currentTransferApp];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
              Ion implantation is essential for semiconductor manufacturing
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
              Application {currentTransferApp + 1} of {realWorldApps.length}
            </p>
          </div>

          {/* Current application card */}
          <div
            style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              border: `2px solid ${currentApp.color}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${currentApp.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentApp.color,
                fontWeight: 700,
                fontSize: '20px',
              }}>
                {currentTransferApp + 1}
              </div>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700 }}>{currentApp.title}</h3>
                <p style={{ color: currentApp.color, fontSize: '12px', fontWeight: 600 }}>{currentApp.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6, fontWeight: 400 }}>
              {currentApp.description}
            </p>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 700 }}>Connection to what you learned:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontWeight: 400 }}>{currentApp.connection}</p>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ color: colors.success, fontSize: '13px', fontWeight: 700 }}>How it works:</p>
              <p style={{ color: colors.textPrimary, fontSize: '13px', marginTop: '8px', fontWeight: 400 }}>{currentApp.howItWorks}</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{ flex: '1 1 80px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: currentApp.color, fontSize: '16px', fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ color: colors.textSecondary, fontSize: '10px', fontWeight: 400 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button */}
            <button
              onClick={() => {
                setTransferCompleted(new Set([...transferCompleted, currentTransferApp]));
                if (currentTransferApp < realWorldApps.length - 1) {
                  setCurrentTransferApp(currentTransferApp + 1);
                }
              }}
              style={{
                width: '100%',
                padding: '14px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${currentApp.color}, ${colors.accent})`,
                color: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 700,
                transition: 'all 0.2s ease',
              }}
            >
              {currentTransferApp < realWorldApps.length - 1 ? 'Got It - Next Application' : 'Got It - Complete'}
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
            {realWorldApps.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTransferApp(i)}
                style={{
                  width: i === currentTransferApp ? '24px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: transferCompleted.has(i) ? colors.success : i === currentTransferApp ? colors.accent : colors.border,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
        {renderBottomBar(transferCompleted.size >= realWorldApps.length, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered ion implantation!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    // Quiz context scenarios for each question - detailed real-world scenarios
    const quizScenarios = [
      'You are designing a transistor for a new smartphone processor at a leading semiconductor fab. The source and drain regions need to be precisely doped at specific depths to achieve the target switching speed and minimize leakage current. Understanding what controls implant depth is fundamental to your design success.',
      'A semiconductor process engineer is analyzing the implant profile of a batch of 300mm silicon wafers using secondary ion mass spectrometry (SIMS). The quality control team needs to verify that the dopant distribution matches specifications and understand what parameters define the profile shape.',
      'Your team is troubleshooting unexpectedly deep implant profiles in production wafers at a major fab. The dopants are appearing much deeper than the calculated projected range would predict. You need to understand the phenomenon causing ions to travel beyond their expected stopping depth.',
      'After ion implantation at 50 keV with a dose of 10^15 ions/cm^2, wafers are sent to the anneal furnace. The process engineer needs to determine the optimal thermal treatment to repair crystal damage and activate the dopants while maintaining the desired profile.',
      'A new high-temperature rapid thermal anneal recipe is being tested as part of process development. You need to predict how the dopant profile will change compared to the standard furnace anneal, considering the physics of dopant diffusion at elevated temperatures.',
      'Modern FinFET transistors at the 5nm node require ultra-shallow junctions with depths below 10nm to prevent short-channel effects. The process integration team needs to select the optimal combination of implant parameters to achieve these aggressive depth targets.',
      'During transistor electrical testing at wafer probe, the threshold voltage varies more than expected across the wafer. Engineers are investigating whether variations in junction depth from the implant process are contributing to the Vth variation.',
      'A new pre-amorphization implant step using silicon or germanium ions is being added to the process flow before the dopant implant. This technique deliberately damages the crystal structure to achieve a specific goal in the subsequent dopant implant step.',
      'The fab is measuring electrical activation of implanted phosphorus dopants using four-point probe sheet resistance measurements. Only activated dopants that occupy specific lattice positions contribute to electrical conduction, making this measurement critical.',
      'Process engineers are optimizing the trade-off between dopant activation and profile broadening in the thermal anneal step. Higher activation improves transistor performance, but the anneal recipe must carefully balance multiple competing requirements.'
    ];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 400 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            {/* Scenario context */}
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '16px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${colors.primary}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, fontWeight: 400, fontStyle: 'italic' }}>
                {quizScenarios[currentTestQuestion]}
              </p>
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 700 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 400,
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#127942;</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered ion implantation physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Ion energy controls implant depth (Rp ~ E^0.7)</li>
              <li>Profile is Gaussian with range Rp and straggle Delta Rp</li>
              <li>Channeling allows deeper penetration along crystal axes</li>
              <li>Annealing repairs damage but broadens the profile</li>
              <li>Dopant activation requires substitutional site occupancy</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fabs use sophisticated implant techniques: plasma doping for ultra-shallow junctions,
              high-energy (MeV) implants for deep wells, and molecular ion implants for precise dose control.
              The interplay of implant and anneal design is critical for achieving sub-10nm transistor performance.
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default IonImplantationRenderer;
