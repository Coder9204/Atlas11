'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// P-WAVES VS S-WAVES RENDERER - Premium Apple/Airbnb Design
// Gold Standard: Sequential transfer navigation with completedApps tracking
// ============================================================================

const realWorldApps = [
   {
      icon: '🌍',
      title: 'Earthquake Early Warning',
      short: 'Seconds that save lives',
      tagline: 'Racing the seismic waves',
      description: 'P-waves travel 1.7x faster than destructive S-waves. Seismometers detect P-waves first, triggering warnings before shaking arrives - giving precious seconds to take cover.',
      connection: 'The speed difference between P and S waves creates a detection window. Closer to the epicenter, less warning time; farther away, more time to react.',
      howItWorks: 'Networks of seismometers detect P-waves and calculate epicenter location within seconds. Automated systems send alerts to phones, trains, and factories before S-waves hit.',
      stats: [
         { value: '5-40s', label: 'Warning time', icon: '⏱️' },
         { value: '1.7x', label: 'P-wave speed advantage', icon: '⚡' },
         { value: '500K+', label: 'Quakes detected/year', icon: '📊' }
      ],
      examples: ['Japan ShakeAlert', 'Mexico SASMEX', 'US ShakeAlert', 'Taiwan CWB system'],
      companies: ['USGS', 'JMA', 'INGV', 'GFZ Potsdam'],
      futureImpact: 'AI systems will predict shaking intensity from first P-wave arrivals.',
      color: '#EF4444'
   },
   {
      icon: '🛢️',
      title: 'Oil & Gas Exploration',
      short: 'Finding hidden reservoirs',
      tagline: 'Seeing underground with sound',
      description: 'Seismic surveys send controlled waves into the ground. S-waves don\'t travel through fluids, so comparing P and S wave reflections reveals underground oil and gas pockets worth billions.',
      connection: 'The S-wave shadow effect - where shear waves are blocked by liquids - creates a distinctive signature that identifies fluid-filled rock formations.',
      howItWorks: 'Vibroseis trucks or air guns create seismic waves. Thousands of geophones record reflections. Computer processing creates 3D maps showing where S-waves disappear.',
      stats: [
         { value: '$30B', label: 'Industry value', icon: '💰' },
         { value: '1000s', label: 'Sensors per survey', icon: '📡' },
         { value: '10km', label: 'Depth penetration', icon: '📏' }
      ],
      examples: ['Offshore drilling', 'Shale gas mapping', 'Geothermal exploration', 'Groundwater surveys'],
      companies: ['Schlumberger', 'Halliburton', 'CGG', 'PGS'],
      futureImpact: 'Machine learning will identify reservoir signatures automatically from seismic data.',
      color: '#F59E0B'
   },
   {
      icon: '🏥',
      title: 'Medical Ultrasound',
      short: 'Safe imaging with sound',
      tagline: 'Seeing babies and organs',
      description: 'Medical ultrasound uses compression waves (like P-waves) because they travel through body fluids. The same physics that lets P-waves cross Earth\'s liquid core lets ultrasound image through blood and amniotic fluid.',
      connection: 'P-waves are compression waves that propagate through any medium. Ultrasound at MHz frequencies follows identical physics, just scaled to medical imaging.',
      howItWorks: 'Piezoelectric transducers emit ultrasound pulses. Echoes from tissue boundaries return at different times, creating images. Doppler effect measures blood flow velocity.',
      stats: [
         { value: '3B+', label: 'Scans per year', icon: '🏥' },
         { value: '2-18MHz', label: 'Frequency range', icon: '📊' },
         { value: '0', label: 'Radiation exposure', icon: '✅' }
      ],
      examples: ['Prenatal imaging', 'Cardiac echo', 'Abdominal scans', 'Vascular doppler'],
      companies: ['GE Healthcare', 'Philips', 'Siemens', 'Canon Medical'],
      futureImpact: 'AI-guided ultrasound will enable non-specialists to perform diagnostic scans.',
      color: '#8B5CF6'
   },
   {
      icon: '🔬',
      title: 'Earth\'s Interior Mapping',
      short: 'Discovering liquid layers',
      tagline: 'X-raying the planet',
      description: 'Scientists discovered Earth\'s liquid outer core because S-waves cannot pass through it, creating a "shadow zone" on the opposite side of earthquakes. This same technique maps the interiors of other planets.',
      connection: 'S-waves require solid material to propagate - they cause shearing motion that liquids cannot support. The sudden disappearance of S-waves reveals liquid boundaries.',
      howItWorks: 'Global seismometer networks record earthquake arrivals. Where S-waves don\'t appear (104-140° from epicenter), there must be liquid blocking them.',
      stats: [
         { value: '2900km', label: 'Core-mantle depth', icon: '🌍' },
         { value: '5150km', label: 'Inner core depth', icon: '📏' },
         { value: '1936', label: 'Discovery year', icon: '📅' }
      ],
      examples: ['Core-mantle boundary', 'Inner core discovery', 'Moon seismology', 'Mars InSight mission'],
      companies: ['NASA', 'ESA', 'IRIS', 'GeoForschungsZentrum'],
      futureImpact: 'Seismometers on Europa and Titan will search for subsurface oceans.',
      color: '#10B981'
   }
];

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
   hook: 'Hook',
   predict: 'Predict',
   play: 'Lab',
   review: 'Review',
   twist_predict: 'Twist Predict',
   twist_play: 'Twist Lab',
   twist_review: 'Twist Review',
   transfer: 'Transfer',
   test: 'Test',
   mastery: 'Mastery'
};

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

interface PWavesSWavesRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Premium Design System
const design = {
   colors: {
      bgPrimary: '#09090b',
      bgSecondary: '#18181b',
      bgTertiary: '#27272a',
      bgElevated: '#3f3f46',
      textPrimary: '#fafafa',
      textSecondary: '#a1a1aa',
      textTertiary: '#71717a',
      textMuted: '#52525b',
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryMuted: '#431407',
      secondary: '#8b5cf6',
      secondaryMuted: '#2e1065',
      success: '#22c55e',
      successMuted: '#052e16',
      warning: '#eab308',
      warningMuted: '#422006',
      danger: '#ef4444',
      dangerMuted: '#450a0a',
      pWave: '#fb923c',
      sWave: '#a78bfa',
      liquid: '#38bdf8',
      solid: '#a1a1aa',
      border: '#3f3f46',
      borderLight: '#52525b',
   },
   radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
   shadow: {
      sm: '0 1px 2px rgba(0,0,0,0.3)',
      md: '0 4px 12px rgba(0,0,0,0.4)',
      lg: '0 8px 32px rgba(0,0,0,0.5)',
      glow: (color: string) => `0 0 40px ${color}40`,
   },
   font: { sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }
};

const PWavesSWavesRenderer: React.FC<PWavesSWavesRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
   // Core state
   const [phase, setPhase] = useState<Phase>(() => {
      if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
      return 'hook';
   });
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [waveType, setWaveType] = useState<'p' | 's'>('p');
   const [medium, setMedium] = useState<'solid' | 'liquid'>('solid');
   const [isWaveActive, setIsWaveActive] = useState(false);
   const [waveProgress, setWaveProgress] = useState(0);
   const [hasExperimented, setHasExperimented] = useState(false);
   const [hasSentSWaveInLiquid, setHasSentSWaveInLiquid] = useState(false);
   const [guidedMode, setGuidedMode] = useState(true);
   const [isMobile, setIsMobile] = useState(false);
   // Slider state for wave frequency control
   const [waveFrequency, setWaveFrequency] = useState(25);

   // Test state
   const [testIndex, setTestIndex] = useState(0);
   const [testScore, setTestScore] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
   const [showExplanation, setShowExplanation] = useState(false);

   // Transfer state - GOLD STANDARD: sequential navigation with completedApps
   const [activeApp, setActiveApp] = useState(0);
   const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

   // Animation refs
   const animationRef = useRef<number>();
   const timeRef = useRef(0);

   // Mobile detection
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

   // Sync with external phase
   useEffect(() => {
      if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase, phase]);

   // Animation loop
   useEffect(() => {
      const animate = () => {
         timeRef.current += 0.05;
         if (isWaveActive) {
            setWaveProgress(prev => {
               if (prev >= 1) {
                  setIsWaveActive(false);
                  return 0;
               }
               return prev + 0.02;
            });
         }
         animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
   }, [isWaveActive]);

   // Sound effect
   const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
      try {
         const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
         const oscillator = audioContext.createOscillator();
         const gainNode = audioContext.createGain();
         oscillator.connect(gainNode);
         gainNode.connect(audioContext.destination);

         const sounds = {
            click: { freq: 600, duration: 0.08, type: 'sine' as OscillatorType, vol: 0.15 },
            success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType, vol: 0.2 },
            failure: { freq: 220, duration: 0.2, type: 'triangle' as OscillatorType, vol: 0.15 },
            transition: { freq: 440, duration: 0.12, type: 'sine' as OscillatorType, vol: 0.15 },
            complete: { freq: 660, duration: 0.25, type: 'sine' as OscillatorType, vol: 0.2 },
         };

         const s = sounds[type];
         oscillator.frequency.value = s.freq;
         oscillator.type = s.type;
         gainNode.gain.setValueAtTime(s.vol, audioContext.currentTime);
         gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.duration);
         oscillator.start();
         oscillator.stop(audioContext.currentTime + s.duration);
      } catch (e) { /* Audio not supported */ }
   }, []);

   // Event emitter
   const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
      onGameEvent?.({ type, data });
   }, [onGameEvent]);

   // Simplified navigation
   const goToPhase = useCallback((newPhase: Phase) => {
      if (!phaseOrder.includes(newPhase)) return;
      setPhase(newPhase);
      playSound('transition');
      emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
      onPhaseComplete?.(newPhase);
   }, [phase, playSound, emitEvent, onPhaseComplete]);

   const goNext = useCallback(() => {
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
   }, [phase, goToPhase]);

   const goBack = useCallback(() => {
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
   }, [phase, goToPhase]);

   // Send wave
   const sendWave = useCallback(() => {
      if (isWaveActive) return;
      setIsWaveActive(true);
      setWaveProgress(0);
      setHasExperimented(true);
      if (waveType === 's' && medium === 'liquid') {
         setHasSentSWaveInLiquid(true);
      }
      emitEvent('simulation_started', { waveType, medium });
   }, [isWaveActive, waveType, medium, emitEvent]);

   // Test questions - 10 comprehensive questions
   const testQuestions = [
      {
         scenario: 'A seismograph station 50 km from an earthquake epicenter records the seismic event. The seismograph clearly shows two distinct wave arrivals separated by 8 seconds. The first arrival is a sharp, brief jolt; the second arrival causes stronger, more sustained shaking of the ground and nearby structures. Seismologists analyze both wave types to locate the epicenter and estimate the magnitude of the earthquake.',
         question: 'Which seismic wave arrives first at a monitoring station?',
         options: [
            { text: 'S-wave (Secondary)', correct: false },
            { text: 'P-wave (Primary)', correct: true },
            { text: 'Surface wave', correct: false },
            { text: 'Both arrive together', correct: false }
         ],
         explanation: 'P-waves (Primary waves) travel about 1.7x faster than S-waves through rock, so they always arrive first—hence the name "Primary."'
      },
      {
         scenario: 'In 1906, geologist Richard Oldham analyzed earthquake records from around the world and noticed a puzzling pattern in the data.',
         question: 'How did scientists discover Earth\'s outer core is liquid?',
         options: [
            { text: 'Temperature measurements', correct: false },
            { text: 'S-wave shadow zone', correct: true },
            { text: 'Drilling experiments', correct: false },
            { text: 'Satellite imagery', correct: false }
         ],
         explanation: 'S-waves cannot travel through liquids. Scientists found that S-waves disappear on the opposite side of Earth after an earthquake, creating a "shadow zone" that proves the outer core is liquid.'
      },
      {
         scenario: 'Imagine pushing a slinky from one end along a table. The compression travels forward while the slinky body moves back and forth.',
         question: 'How do particles move in a P-wave?',
         options: [
            { text: 'Perpendicular to wave direction', correct: false },
            { text: 'Parallel to wave direction (compression)', correct: true },
            { text: 'In circular orbits', correct: false },
            { text: 'They don\'t move', correct: false }
         ],
         explanation: 'P-waves are compression waves—particles push and pull back and forth parallel to the direction the wave travels, like a slinky being pushed from one end.'
      },
      {
         scenario: 'A scientist runs an experiment: they create S-waves in solid rock and try to transmit them into a tank of water. The waves disappear at the water boundary.',
         question: 'Why can\'t S-waves travel through liquids?',
         options: [
            { text: 'Liquids are too dense', correct: false },
            { text: 'Liquids move too fast', correct: false },
            { text: 'Liquids cannot support shear stress', correct: true },
            { text: 'S-waves are always slower', correct: false }
         ],
         explanation: 'S-waves require the material to "spring back" when displaced sideways (shear). Liquids flow instead of springing back—there\'s no restoring force to propagate the wave.'
      },
      {
         scenario: 'You are in a building 50 km from an earthquake epicenter. First you feel a brief, sharp jolt. Eight seconds later, stronger shaking begins.',
         question: 'In an earthquake, what causes the first sharp jolt you feel?',
         options: [
            { text: 'S-wave arrival', correct: false },
            { text: 'P-wave arrival', correct: true },
            { text: 'Surface wave', correct: false },
            { text: 'Aftershock', correct: false }
         ],
         explanation: 'The faster P-wave arrives first as a sharp, quick jolt. The more damaging S-wave arrives seconds later with stronger shaking.'
      },
      {
         scenario: 'A pregnant patient is receiving an ultrasound scan. The probe emits high-frequency sound waves that pass through the amniotic fluid to image the baby.',
         question: 'Medical ultrasound uses which type of wave principle?',
         options: [
            { text: 'S-waves (shear)', correct: false },
            { text: 'P-waves (compression)', correct: true },
            { text: 'Surface waves', correct: false },
            { text: 'Electromagnetic waves', correct: false }
         ],
         explanation: 'Ultrasound uses compression waves (same principle as P-waves) because they can travel through fluids like blood and amniotic fluid.'
      },
      {
         scenario: 'An oil company sends controlled seismic waves into the ground. Some sensors detect both wave types, but sensors above certain areas only detect P-waves.',
         question: 'How do oil companies use P and S waves together?',
         options: [
            { text: 'Only P-waves are used', correct: false },
            { text: 'S-waves reflect differently off fluid reservoirs', correct: true },
            { text: 'For legal compliance', correct: false },
            { text: 'They cannot be used together', correct: false }
         ],
         explanation: 'S-waves are blocked by fluid-filled reservoirs while P-waves pass through. This difference helps locate underground oil and gas deposits.'
      },
      {
         scenario: 'NASA\'s InSight lander on Mars is recording seismic data. Scientists want to determine if Mars has a liquid core like Earth does.',
         question: 'If you wanted to detect a liquid layer inside another planet, what would you look for?',
         options: [
            { text: 'Higher temperatures', correct: false },
            { text: 'S-wave shadow zone', correct: true },
            { text: 'Magnetic field changes', correct: false },
            { text: 'Visual light reflection', correct: false }
         ],
         explanation: 'Just like on Earth, an S-wave shadow zone would indicate liquid layers—this is how planetary scientists study the interiors of planets and moons.'
      },
      {
         scenario: 'An earthquake occurs deep in Earth\'s mantle. Seismometers on the surface detect P-waves arriving from unexpected directions, bent by internal layers.',
         question: 'What happens when P-waves enter the liquid outer core?',
         options: [
            { text: 'They stop completely', correct: false },
            { text: 'They speed up dramatically', correct: false },
            { text: 'They slow down and bend', correct: true },
            { text: 'They convert to S-waves', correct: false }
         ],
         explanation: 'P-waves slow down in liquid (from ~14 km/s to ~8 km/s) and bend (refract) at the boundary. This creates a P-wave shadow zone between 104° and 140° from the epicenter.'
      },
      {
         scenario: 'A magnitude 6.5 earthquake strikes near a city. Buildings sway violently after an initial sharp knock. Engineers study the wave arrival patterns to understand building damage.',
         question: 'Why do buildings often shake more during S-wave passage than P-wave?',
         options: [
            { text: 'S-waves are always larger', correct: false },
            { text: 'S-wave shear motion causes more horizontal movement', correct: true },
            { text: 'P-waves are absorbed by ground', correct: false },
            { text: 'S-waves last longer', correct: false }
         ],
         explanation: 'S-waves cause side-to-side (shear) motion which is more damaging to buildings than the back-and-forth compression of P-waves. Buildings are better at resisting vertical loads than horizontal shaking.'
      }
   ];

   // Real-world applications - 4 detailed applications
   const applications = [
      {
         icon: '🌍',
         title: 'Earthquake Early Warning',
         description: 'Modern seismometers detect P-waves within seconds of an earthquake. Since P-waves travel faster but cause less damage than S-waves, this gives precious seconds of warning before the destructive S-waves arrive.',
         details: [
            'Japan\'s system gives 5-40 seconds warning',
            'Trains automatically slow down',
            'Factories can shut off gas lines',
            'Elevators stop at nearest floor'
         ],
         stat: '500,000+ earthquakes detected yearly',
         color: design.colors.primary
      },
      {
         icon: '🛢️',
         title: 'Oil & Gas Exploration',
         description: 'Seismic surveys send controlled waves into the ground. Since S-waves don\'t travel through fluids but P-waves do, comparing their reflections reveals underground oil and gas reservoirs worth billions.',
         details: [
            'Artificial seismic sources create waves',
            'Thousands of sensors record reflections',
            'S-wave shadows indicate fluid pockets',
            'Computer models create 3D reservoir maps'
         ],
         stat: '$30 billion industry worldwide',
         color: design.colors.success
      },
      {
         icon: '🏥',
         title: 'Medical Ultrasound Imaging',
         description: 'Ultrasound uses compression waves (like P-waves) that can travel through body fluids. Echoes from different tissues create real-time images of babies, organs, and blood flow without radiation.',
         details: [
            'Frequencies: 2-18 MHz (vs 0.1 Hz for earthquakes)',
            'Works through amniotic fluid and blood',
            'Doppler effect measures blood flow speed',
            'Safe enough for routine pregnancy monitoring'
         ],
         stat: '3+ billion scans performed yearly',
         color: design.colors.secondary
      },
      {
         icon: '🏗️',
         title: 'Structural Integrity Testing',
         description: 'Non-destructive testing sends ultrasonic waves through bridges, pipelines, and aircraft. Waves reflect off hidden cracks and defects, revealing dangerous flaws before they cause failures.',
         details: [
            'Tests welds in nuclear reactors',
            'Inspects aircraft wings for fatigue cracks',
            'Monitors bridge supports for corrosion',
            'Checks pipelines for wall thinning'
         ],
         stat: '99.9% defect detection accuracy',
         color: design.colors.warning
      }
   ];

   // ============ HELPER FUNCTIONS (not React components) ============

   const renderButton = (
      text: string,
      onClick: () => void,
      variant: 'primary' | 'secondary' | 'ghost' = 'primary',
      disabled: boolean = false,
      fullWidth: boolean = false
   ) => {
      const baseStyle: React.CSSProperties = {
         padding: isMobile ? '14px 24px' : '16px 32px',
         borderRadius: design.radius.md,
         fontWeight: 600,
         fontSize: isMobile ? '15px' : '16px',
         fontFamily: design.font.sans,
         border: 'none',
         cursor: disabled ? 'not-allowed' : 'pointer',
         opacity: disabled ? 0.5 : 1,
         transition: 'all 0.2s ease',
         width: fullWidth ? '100%' : 'auto',
         zIndex: 10,
      };

      const variants = {
         primary: {
            background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`,
            color: 'white',
            boxShadow: design.shadow.md,
         },
         secondary: {
            background: design.colors.bgTertiary,
            color: design.colors.textSecondary,
            border: `1px solid ${design.colors.border}`,
         },
         ghost: {
            background: 'transparent',
            color: design.colors.textSecondary,
         }
      };

      return (
         <button
            onClick={(e) => {
               e.preventDefault();
               if (!disabled) {
                  onClick();
               }
            }}
            style={{ ...baseStyle, ...variants[variant] }}
         >
            {text}
         </button>
      );
   };

   const renderProgressBar = () => {
      const currentIdx = phaseOrder.indexOf(phase);
      const phaseAriaLabels: Record<Phase, string> = {
         hook: 'Explore - Introduction',
         predict: 'Predict - Make Your Guess',
         play: 'Experiment - Lab Simulation',
         review: 'Review - What You Learned',
         twist_predict: 'Explore Twist - New Prediction',
         twist_play: 'Experiment Twist - Twist Lab',
         twist_review: 'Review Twist - Key Insight',
         transfer: 'Transfer - Real World Apply',
         test: 'Quiz - Knowledge Test',
         mastery: 'Mastery - Completion',
      };
      return (
         <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '16px',
            borderBottom: `1px solid ${design.colors.border}`,
            background: design.colors.bgSecondary,
         }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginRight: '8px' }}>
               P &amp; S Waves
            </span>
            {phaseOrder.map((p, i) => (
               <button
                  key={i}
                  aria-label={phaseAriaLabels[p]}
                  title={phaseAriaLabels[p]}
                  onClick={() => goToPhase(p)}
                  style={{
                     width: i === currentIdx ? '24px' : '8px',
                     height: '8px',
                     borderRadius: design.radius.full,
                     background: i < currentIdx ? design.colors.success : i === currentIdx ? design.colors.primary : design.colors.bgElevated,
                     transition: 'all 0.3s ease',
                     border: 'none',
                     padding: 0,
                     cursor: 'pointer',
                     flexShrink: 0,
                  }}
               />
            ))}
            <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 600, color: design.colors.textTertiary }}>
               {currentIdx + 1}/10
            </span>
         </div>
      );
   };

   const renderBottomNav = (backPhase: Phase | null, nextPhase: Phase | null, nextText: string = 'Continue →', nextDisabled: boolean = false) => (
      <div style={{
         padding: '20px 24px',
         borderTop: `1px solid ${design.colors.border}`,
         background: design.colors.bgSecondary,
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         gap: '12px',
      }}>
         {backPhase ? renderButton('← Back', () => goToPhase(backPhase), 'ghost') : <div />}
         {nextPhase && renderButton(nextText, () => goToPhase(nextPhase), 'primary', nextDisabled)}
      </div>
   );

   // Wave visualization component - Premium SVG Graphics
   const renderWaveVisualization = () => {
      const sWaveBlocked = waveType === 's' && medium === 'liquid';
      const numParticles = 14;
      // Use waveFrequency slider to scale amplitude (1-100 Hz mapped to 0.5x-2x)
      const freqScale = 0.5 + (waveFrequency / 100) * 1.5;

      return (
         <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Title for SVG */}
            <h3 style={{
               fontSize: typo.body,
               fontWeight: 700,
               color: design.colors.textPrimary,
               marginBottom: '8px',
               textAlign: 'center'
            }}>
               Wave Propagation Through {medium === 'solid' ? 'Solid Rock' : 'Liquid Medium'}
            </h3>
            <svg viewBox="0 0 600 240" style={{ width: '100%', height: '100%', maxHeight: '240px' }} preserveAspectRatio="xMidYMid meet">
               <title>Wave Propagation Through {medium === 'solid' ? 'Solid Rock' : 'Liquid Medium'}</title>
               <defs>
                  {/* ========== PREMIUM GRADIENT DEFINITIONS ========== */}

                  {/* P-Wave gradient - warm orange/amber tones */}
                  <linearGradient id="pswPWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="#fcd34d" />
                     <stop offset="25%" stopColor="#fbbf24" />
                     <stop offset="50%" stopColor="#f97316" />
                     <stop offset="75%" stopColor="#ea580c" />
                     <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>

                  {/* S-Wave gradient - cool purple/violet tones */}
                  <linearGradient id="pswSWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="#e9d5ff" />
                     <stop offset="25%" stopColor="#c4b5fd" />
                     <stop offset="50%" stopColor="#a78bfa" />
                     <stop offset="75%" stopColor="#8b5cf6" />
                     <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>

                  {/* Solid medium gradient - rocky/granite appearance */}
                  <linearGradient id="pswSolidMedium" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#52525b" />
                     <stop offset="20%" stopColor="#3f3f46" />
                     <stop offset="50%" stopColor="#27272a" />
                     <stop offset="80%" stopColor="#1f1f23" />
                     <stop offset="100%" stopColor="#18181b" />
                  </linearGradient>

                  {/* Liquid medium gradient - deep ocean/molten appearance */}
                  <linearGradient id="pswLiquidMedium" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                     <stop offset="25%" stopColor="#0284c7" stopOpacity="0.35" />
                     <stop offset="50%" stopColor="#0369a1" stopOpacity="0.3" />
                     <stop offset="75%" stopColor="#075985" stopOpacity="0.25" />
                     <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.2" />
                  </linearGradient>

                  {/* Wave source radial gradient */}
                  <radialGradient id="pswSourceGlow" cx="50%" cy="50%" r="50%">
                     <stop offset="0%" stopColor={waveType === 'p' ? '#fbbf24' : '#c4b5fd'} stopOpacity="1" />
                     <stop offset="40%" stopColor={waveType === 'p' ? '#f97316' : '#a78bfa'} stopOpacity="0.8" />
                     <stop offset="70%" stopColor={waveType === 'p' ? '#ea580c' : '#8b5cf6'} stopOpacity="0.5" />
                     <stop offset="100%" stopColor={waveType === 'p' ? '#c2410c' : '#7c3aed'} stopOpacity="0" />
                  </radialGradient>

                  {/* Earth cross-section gradient for background depth */}
                  <radialGradient id="pswEarthCrossSection" cx="50%" cy="120%" r="100%">
                     <stop offset="0%" stopColor="#78350f" stopOpacity="0.15" />
                     <stop offset="30%" stopColor="#451a03" stopOpacity="0.1" />
                     <stop offset="60%" stopColor="#1c0a00" stopOpacity="0.05" />
                     <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
                  </radialGradient>

                  {/* Compression zone gradient for P-wave visualization */}
                  <linearGradient id="pswCompressionZone" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                     <stop offset="40%" stopColor="#fb923c" stopOpacity="0.4" />
                     <stop offset="50%" stopColor="#fdba74" stopOpacity="0.6" />
                     <stop offset="60%" stopColor="#fb923c" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>

                  {/* Shear zone gradient for S-wave visualization */}
                  <linearGradient id="pswShearZone" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
                     <stop offset="40%" stopColor="#c4b5fd" stopOpacity="0.4" />
                     <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.6" />
                     <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </linearGradient>

                  {/* ========== GLOW FILTERS ========== */}

                  {/* Particle glow filter */}
                  <filter id="pswParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Intense source glow */}
                  <filter id="pswSourceGlowFilter" x="-150%" y="-150%" width="400%" height="400%">
                     <feGaussianBlur stdDeviation="5" result="blur1" />
                     <feGaussianBlur stdDeviation="2" result="blur2" />
                     <feMerge>
                        <feMergeNode in="blur1" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Wave propagation pulse filter */}
                  <filter id="pswWavePulse" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="4" result="blur" />
                     <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Danger glow for blocked indicator */}
                  <filter id="pswDangerGlow" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                     </feMerge>
                  </filter>

                  {/* Connection line gradient */}
                  <linearGradient id="pswConnectionLine" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#71717a" stopOpacity="0.6" />
                     <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#71717a" stopOpacity="0.6" />
                  </linearGradient>
               </defs>

               {/* Background with earth cross-section effect */}
               <rect width="600" height="240" fill="#09090b" />
               <rect width="600" height="240" fill="url(#pswEarthCrossSection)" />

               {/* Subtle grid pattern for scientific feel */}
               {Array.from({ length: 12 }).map((_, i) => (
                  <line key={`vgrid-${i}`} x1={50 + i * 50} y1="30" x2={50 + i * 50} y2="200" stroke="#27272a" strokeWidth="1" opacity="0.3" />
               ))}
               {Array.from({ length: 4 }).map((_, i) => (
                  <line key={`hgrid-${i}`} x1="40" y1={50 + i * 50} x2="560" y2={50 + i * 50} stroke="#27272a" strokeWidth="1" opacity="0.3" />
               ))}

               {/* Axis labels */}
               <text x="300" y="225" textAnchor="middle" style={{ fontSize: '11px', fill: design.colors.textTertiary, fontWeight: 600 }}>
                  Distance (Wave Direction) →
               </text>
               <text x="25" y="115" textAnchor="middle" transform="rotate(-90, 25, 115)" style={{ fontSize: '11px', fill: design.colors.textTertiary, fontWeight: 600 }}>
                  Amplitude
               </text>

               {/* Medium container with premium styling */}
               <rect x="40" y="40" width="520" height="150" rx="12"
                  fill={medium === 'solid' ? 'url(#pswSolidMedium)' : 'url(#pswLiquidMedium)'}
                  stroke={medium === 'solid' ? '#52525b' : '#0ea5e9'}
                  strokeWidth="2"
                  opacity="0.95" />

               {/* Medium inner glow effect */}
               <rect x="42" y="42" width="516" height="146" rx="10"
                  fill="none"
                  stroke={medium === 'solid' ? '#71717a' : '#38bdf8'}
                  strokeWidth="1"
                  opacity="0.3" />

               {/* Liquid wave effect when in liquid medium */}
               {medium === 'liquid' && (
                  <g opacity="0.4">
                     {Array.from({ length: 3 }).map((_, i) => (
                        <path
                           key={`liquidwave-${i}`}
                           d={`M 40 ${60 + i * 40} Q ${100 + Math.sin(timeRef.current + i) * 10} ${55 + i * 40} 160 ${60 + i * 40} T 280 ${60 + i * 40} T 400 ${60 + i * 40} T 520 ${60 + i * 40} T 560 ${60 + i * 40}`}
                           fill="none"
                           stroke="#38bdf8"
                           strokeWidth="1"
                           opacity={0.3 - i * 0.08}
                        />
                     ))}
                  </g>
               )}

               {/* Wave source with pulsing glow */}
               <g filter="url(#pswSourceGlowFilter)">
                  {/* Outer pulse ring */}
                  <circle cx="65" cy="115" r={isWaveActive ? 24 + Math.sin(timeRef.current * 8) * 4 : 22}
                     fill="none"
                     stroke={waveType === 'p' ? '#f97316' : '#a78bfa'}
                     strokeWidth="2"
                     opacity={isWaveActive ? 0.6 : 0.3} />

                  {/* Main source circle */}
                  <circle cx="65" cy="115" r="16"
                     fill="url(#pswSourceGlow)"
                     opacity={isWaveActive ? 1 : 0.7} />

                  {/* Inner bright core */}
                  <circle cx="65" cy="115" r="8"
                     fill={waveType === 'p' ? '#fcd34d' : '#e9d5ff'}
                     opacity={isWaveActive ? 0.9 : 0.6} />
               </g>

               {/* Wave propagation effect - compression rings for P-wave */}
               {waveType === 'p' && isWaveActive && (
                  <g>
                     {Array.from({ length: 3 }).map((_, i) => {
                        const ringProgress = (waveProgress - i * 0.1);
                        if (ringProgress <= 0 || ringProgress > 1) return null;
                        const ringX = 65 + ringProgress * 450;
                        return (
                           <ellipse
                              key={`pring-${i}`}
                              cx={ringX}
                              cy="115"
                              rx={12 + ringProgress * 8}
                              ry={40 - ringProgress * 10}
                              fill="url(#pswCompressionZone)"
                              opacity={0.5 * (1 - ringProgress)}
                              filter="url(#pswWavePulse)"
                           />
                        );
                     })}
                  </g>
               )}

               {/* Wave propagation effect - shear bands for S-wave */}
               {waveType === 's' && isWaveActive && !sWaveBlocked && (
                  <g>
                     {Array.from({ length: 3 }).map((_, i) => {
                        const bandProgress = (waveProgress - i * 0.1);
                        if (bandProgress <= 0 || bandProgress > 1) return null;
                        const bandX = 65 + bandProgress * 450;
                        return (
                           <rect
                              key={`sband-${i}`}
                              x={bandX - 10}
                              y={70}
                              width={20}
                              height={90}
                              rx={5}
                              fill="url(#pswShearZone)"
                              opacity={0.4 * (1 - bandProgress)}
                              filter="url(#pswWavePulse)"
                           />
                        );
                     })}
                  </g>
               )}

               {/* Particle chain with premium styling */}
               {Array.from({ length: numParticles }).map((_, i) => {
                  const baseX = 110 + i * 32;
                  const waveReached = waveProgress * numParticles > i;
                  const intensity = waveReached ? Math.max(0, 1 - Math.abs(waveProgress * numParticles - i) / 3) : 0;

                  let offsetX = 0, offsetY = 0;
                  if (waveType === 'p') {
                     // P-wave: compression (parallel motion) - scaled by frequency
                     offsetX = intensity * Math.sin(timeRef.current * 12 + i * 0.8) * 14 * freqScale;
                  } else if (medium === 'solid') {
                     // S-wave in solid: shear (perpendicular motion) - scaled by frequency
                     offsetY = intensity * Math.sin(timeRef.current * 12 + i * 0.8) * 18 * freqScale;
                  } else {
                     // S-wave in liquid: rapidly decays
                     offsetY = intensity * Math.sin(timeRef.current * 12 + i * 0.8) * 18 * freqScale * Math.exp(-i * 0.5);
                  }

                  const isBlocked = sWaveBlocked && i > 2;
                  const particleGradient = waveReached
                     ? (waveType === 'p' ? 'url(#pswPWaveGrad)' : 'url(#pswSWaveGrad)')
                     : '#52525b';

                  return (
                     <g key={i}>
                        {/* Connection line with gradient */}
                        {i < numParticles - 1 && (
                           <line
                              x1={baseX + offsetX}
                              y1={115 + offsetY}
                              x2={110 + (i + 1) * 32}
                              y2={115}
                              stroke="url(#pswConnectionLine)"
                              strokeWidth={isBlocked ? 1 : 2}
                              opacity={isBlocked ? 0.15 : 0.5}
                           />
                        )}

                        {/* Particle outer glow */}
                        {waveReached && !isBlocked && (
                           <circle
                              cx={baseX + offsetX}
                              cy={115 + offsetY}
                              r="12"
                              fill={waveType === 'p' ? '#f97316' : '#a78bfa'}
                              opacity={intensity * 0.3}
                              filter="url(#pswParticleGlow)"
                           />
                        )}

                        {/* Main particle */}
                        <circle
                           cx={baseX + offsetX}
                           cy={115 + offsetY}
                           r="8"
                           fill={particleGradient}
                           opacity={isBlocked ? 0.2 : 0.95}
                           filter={waveReached && !isBlocked ? 'url(#pswParticleGlow)' : undefined}
                        />

                        {/* Particle highlight */}
                        {!isBlocked && (
                           <circle
                              cx={baseX + offsetX - 2}
                              cy={115 + offsetY - 2}
                              r="3"
                              fill="white"
                              opacity={waveReached ? 0.4 : 0.15}
                           />
                        )}
                     </g>
                  );
               })}

               {/* S-wave blocked indicator with premium styling */}
               {sWaveBlocked && isWaveActive && waveProgress > 0.2 && (
                  <g filter="url(#pswDangerGlow)">
                     {/* Blocked zone visualization */}
                     <rect x="200" y="60" width="180" height="110" rx="10"
                        fill="#450a0a" fillOpacity="0.9"
                        stroke="#ef4444" strokeWidth="2" />

                     {/* X pattern */}
                     <line x1="220" y1="80" x2="360" y2="150" stroke="#ef4444" strokeWidth="3" opacity="0.6" />
                     <line x1="360" y1="80" x2="220" y2="150" stroke="#ef4444" strokeWidth="3" opacity="0.6" />

                     {/* Warning icon area */}
                     <circle cx="290" cy="100" r="18" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
                     <text x="290" y="107" textAnchor="middle" style={{ fontSize: '18px' }}>!</text>
                  </g>
               )}

               {/* Wave type indicator panel with premium styling */}
               <rect x="470" y="50" width="80" height="90" rx="10"
                  fill="#18181b"
                  stroke={waveType === 'p' ? '#f97316' : '#a78bfa'}
                  strokeWidth="2"
                  opacity="0.95" />

               {/* Wave type icon */}
               <circle cx="510" cy="80" r="18"
                  fill={waveType === 'p' ? 'url(#pswPWaveGrad)' : 'url(#pswSWaveGrad)'}
               />

               {/* Direction arrows inside circle */}
               <text x="510" y="86" textAnchor="middle"
                  style={{ fontSize: '14px', fontWeight: 700, fill: '#18181b' }}>
                  {waveType === 'p' ? '\u2194' : '\u2195'}
               </text>

               {/* Frequency display box - changes with slider */}
               <rect x="40" y="170" width="100" height="30" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" opacity="0.9" />
               <text x="90" y="182" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">FREQUENCY</text>
               <text x="90" y="196" textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="700">{waveFrequency} Hz</text>

               {/* Frequency indicator bar - moves with waveFrequency slider */}
               <rect x="150" y="205" width="400" height="6" rx="3" fill="#27272a" />
               <rect x="150" y="205" width={waveFrequency * 4} height="6" rx="3" fill={waveType === 'p' ? '#fb923c' : '#a78bfa'} />

               {/* SVG Legend */}
               <rect x="150" y="195" width="10" height="10" rx="2" fill="#fb923c" />
               <text x="165" y="204" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="400">P-Wave</text>
               <rect x="215" y="195" width="10" height="10" rx="2" fill="#a78bfa" />
               <text x="230" y="204" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="400">S-Wave</text>
            </svg>

            {/* Labels outside SVG using typo system */}
            <div style={{
               width: '100%',
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'flex-start',
               padding: '8px 40px',
               marginTop: '4px'
            }}>
               {/* Left: Medium label */}
               <div style={{
                  fontSize: typo.small,
                  fontWeight: 700,
                  color: medium === 'solid' ? design.colors.solid : design.colors.liquid,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
               }}>
                  {medium === 'solid' ? 'Solid Medium (Rock)' : 'Liquid Medium'}
               </div>

               {/* Center: Motion explanation */}
               <div style={{
                  textAlign: 'center',
                  flex: 1,
                  padding: '0 16px'
               }}>
                  <div style={{
                     fontSize: typo.small,
                     color: design.colors.textSecondary,
                     marginBottom: '2px'
                  }}>
                     {waveType === 'p'
                        ? 'P-Wave: Compression motion parallel to direction'
                        : 'S-Wave: Shear motion perpendicular to direction'}
                  </div>
                  <div style={{
                     fontSize: typo.label,
                     color: design.colors.textTertiary
                  }}>
                     {waveType === 'p'
                        ? 'Speed: ~6-8 km/s in rock \u2022 Arrives FIRST'
                        : 'Speed: ~3.5-4.5 km/s in rock \u2022 Arrives SECOND'}
                  </div>
               </div>

               {/* Right: Wave type label */}
               <div style={{
                  textAlign: 'right'
               }}>
                  <div style={{
                     fontSize: typo.body,
                     fontWeight: 800,
                     color: waveType === 'p' ? design.colors.pWave : design.colors.sWave
                  }}>
                     {waveType === 'p' ? 'P-Wave' : 'S-Wave'}
                  </div>
                  <div style={{
                     fontSize: typo.label,
                     color: design.colors.textTertiary
                  }}>
                     {waveType === 'p' ? 'Compression' : 'Shear'}
                  </div>
               </div>
            </div>

            {/* S-wave blocked message outside SVG */}
            {sWaveBlocked && isWaveActive && waveProgress > 0.2 && (
               <div style={{
                  marginTop: '8px',
                  padding: '10px 20px',
                  borderRadius: design.radius.md,
                  background: design.colors.dangerMuted,
                  border: `2px solid ${design.colors.danger}`,
                  textAlign: 'center'
               }}>
                  <div style={{
                     fontSize: typo.body,
                     fontWeight: 800,
                     color: design.colors.danger,
                     marginBottom: '2px'
                  }}>
                     S-WAVE BLOCKED
                  </div>
                  <div style={{
                     fontSize: typo.small,
                     color: '#fca5a5'
                  }}>
                     Liquids cannot support shear stress
                  </div>
               </div>
            )}

            {/* Formula display */}
            <div style={{
               marginTop: '12px',
               padding: '12px 16px',
               borderRadius: design.radius.md,
               background: design.colors.bgSecondary,
               border: `1px solid ${design.colors.border}`,
               textAlign: 'center',
               maxWidth: '400px',
               width: '100%'
            }}>
               <div style={{
                  fontSize: typo.small,
                  fontWeight: 700,
                  color: design.colors.textTertiary,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
               }}>
                  Wave Speed Formula
               </div>
               <div style={{
                  fontSize: typo.body,
                  fontWeight: 600,
                  color: waveType === 'p' ? design.colors.pWave : design.colors.sWave,
                  fontFamily: 'monospace'
               }}>
                  {waveType === 'p'
                     ? 'v_p = √((K + 4μ/3) / ρ)'
                     : 'v_s = √(μ / ρ)'}
               </div>
               <div style={{
                  fontSize: typo.label,
                  color: design.colors.textTertiary,
                  marginTop: '4px'
               }}>
                  {waveType === 'p'
                     ? 'K = bulk modulus, μ = shear modulus, ρ = density'
                     : 'μ = shear modulus (≈0 in liquids), ρ = density'}
               </div>
            </div>
         </div>
      );
   };

   // ============ PHASE RENDERS ============

   // HOOK PHASE
   if (phase === 'hook') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: '#0a0f1a',
            fontFamily: design.font.sans,
            position: 'relative',
            overflow: 'hidden',
         }}>
            {renderProgressBar()}
            {/* Premium background glow circles */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
            <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: 'rgba(249, 115, 22, 0.05)', borderRadius: '50%', filter: 'blur(64px)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: '25%', width: 384, height: 384, background: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(64px)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 384, height: 384, background: 'rgba(34, 197, 94, 0.03)', borderRadius: '50%', filter: 'blur(64px)' }} />

            <div style={{
               position: 'relative',
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: isMobile ? '32px 20px' : '48px 32px',
               textAlign: 'center',
               overflowY: 'auto',
            }}>
               {/* Icon */}
               <div style={{
                  width: isMobile ? '80px' : '96px',
                  height: isMobile ? '80px' : '96px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${design.colors.primary} 0%, #c2410c 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '28px',
                  boxShadow: design.shadow.glow(design.colors.primary),
               }}>
                  <span style={{ fontSize: isMobile ? '36px' : '44px' }}>🌍</span>
               </div>

               {/* Mystery intro */}
               <div style={{
                  padding: '12px 24px',
                  borderRadius: design.radius.full,
                  background: design.colors.primaryMuted,
                  border: `1px solid ${design.colors.primary}30`,
                  marginBottom: '20px',
               }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.primary }}>
                     🔬 A Scientific Mystery
                  </span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '32px' : '40px',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
               }}>
                  P-Waves vs S-Waves
               </h1>

               <p style={{
                  fontSize: isMobile ? '16px' : '18px',
                  color: design.colors.textSecondary,
                  marginBottom: '12px',
                  maxWidth: '440px',
                  lineHeight: 1.6,
                  fontWeight: 400,
               }}>
                  How did scientists prove Earth's outer core is{' '}
                  <span style={{ color: design.colors.liquid, fontWeight: 700 }}>liquid</span>
                  {' '}without ever drilling there?
               </p>

               <p style={{
                  fontSize: '15px',
                  color: 'rgba(148,163,184,0.7)',
                  marginBottom: '36px',
                  maxWidth: '400px',
                  fontWeight: 400,
               }}>
                  The answer lies in two types of seismic waves with very different properties...
               </p>

               {/* Feature grid */}
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  maxWidth: '440px',
                  width: '100%',
                  marginBottom: '36px',
               }}>
                  {[
                     { icon: '🌊', label: 'Two Wave Types' },
                     { icon: '💧', label: 'Liquid Mystery' },
                     { icon: '🔬', label: 'Virtual Lab' },
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: '18px 12px',
                        borderRadius: design.radius.lg,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{ fontSize: '26px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               {/* AI Coach toggle */}
               <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '28px',
                  padding: '12px 20px',
                  borderRadius: design.radius.full,
                  background: design.colors.bgSecondary,
                  border: `1px solid ${design.colors.border}`,
               }}>
                  <span style={{ fontSize: '14px', color: design.colors.textSecondary }}>AI Coach</span>
                  <button
                     onClick={() => setGuidedMode(!guidedMode)}
                     style={{
                        width: '48px',
                        height: '26px',
                        borderRadius: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        background: guidedMode ? design.colors.success : design.colors.bgElevated,
                        position: 'relative',
                        transition: 'background 0.2s',
                        zIndex: 10,
                     }}
                  >
                     <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '3px',
                        left: guidedMode ? '25px' : '3px',
                        transition: 'left 0.2s',
                        boxShadow: design.shadow.sm,
                     }} />
                  </button>
                  <span style={{
                     fontSize: '13px',
                     fontWeight: 600,
                     color: guidedMode ? design.colors.success : design.colors.textMuted
                  }}>
                     {guidedMode ? 'ON' : 'OFF'}
                  </span>
               </div>

               {renderButton('Begin Exploration →', () => goToPhase('predict'))}

               <p style={{
                  fontSize: '13px',
                  color: design.colors.textMuted,
                  marginTop: '20px',
               }}>
                  ~5 minutes • Interactive seismic simulation
               </p>
            </div>
         </div>
      );
   }

   // PREDICT PHASE
   if (phase === 'predict') {
      const options = [
         { id: 'p_only', label: 'Only P-waves (compression)', desc: 'Push-pull compression works everywhere', icon: '← →' },
         { id: 's_only', label: 'Only S-waves (shear)', desc: 'Side-to-side shearing works everywhere', icon: '↑ ↓' },
         { id: 'both', label: 'Both wave types', desc: 'All seismic waves travel through all materials', icon: '◈' },
         { id: 'neither', label: 'Neither wave type', desc: 'Liquids block all seismic waves completely', icon: '✕' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 20px' : '32px 24px', paddingBottom: '80px', paddingTop: '44px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 2 • Make Your Prediction
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
               }}>
                  Which wave type can travel through liquids?
               </h2>
               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '20px',
                  lineHeight: 1.6,
                  maxWidth: '520px',
                  fontWeight: 400,
               }}>
                  Seismologists detect two distinct wave types after earthquakes. One arrives first (Primary), one arrives second (Secondary). But something strange happens when they hit Earth's liquid outer core...
               </p>

               {/* Static SVG diagram showing the seismic wave scenario */}
               <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}`, maxWidth: '520px' }}>
                  <svg viewBox="0 0 520 160" width="100%" style={{ display: 'block' }}>
                     <defs>
                        <linearGradient id="predictSolidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                           <stop offset="0%" stopColor="#52525b" />
                           <stop offset="100%" stopColor="#27272a" />
                        </linearGradient>
                        <linearGradient id="predictLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                           <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
                           <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
                        </linearGradient>
                        <filter id="predictGlow">
                           <feGaussianBlur stdDeviation="2" result="blur" />
                           <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                     </defs>
                     {/* Background */}
                     <rect width="520" height="160" fill="#09090b" />
                     {/* Grid lines */}
                     {[0,1,2,3].map(i => (
                        <line key={`hg-${i}`} x1="10" y1={30 + i*35} x2="510" y2={30 + i*35} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                     ))}
                     {/* Solid rock layer - left side */}
                     <rect x="10" y="20" width="220" height="120" rx="8" fill="url(#predictSolidGrad)" stroke="#52525b" strokeWidth="1.5" />
                     <text x="120" y="38" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">SOLID ROCK</text>
                     {/* Liquid core - right side */}
                     <rect x="280" y="20" width="230" height="120" rx="8" fill="url(#predictLiquidGrad)" stroke="#0ea5e9" strokeWidth="1.5" />
                     <text x="395" y="38" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">LIQUID CORE</text>
                     {/* P-wave arrow - travels through both */}
                     <line x1="30" y1="75" x2="230" y2="75" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="6 3" />
                     <polygon points="230,70 245,75 230,80" fill="#fb923c" />
                     <line x1="285" y1="75" x2="495" y2="75" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="6 3" />
                     <polygon points="495,70 510,75 495,80" fill="#fb923c" />
                     <text x="130" y="65" textAnchor="middle" fill="#fb923c" fontSize="11" fontWeight="700">P-Wave ✓</text>
                     {/* S-wave arrow - blocked at liquid */}
                     <line x1="30" y1="110" x2="230" y2="110" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="6 3" />
                     <polygon points="230,105 245,110 230,115" fill="#a78bfa" />
                     <text x="130" y="100" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="700">S-Wave ?</text>
                     {/* Boundary line */}
                     <line x1="240" y1="15" x2="240" y2="148" stroke="#71717a" strokeWidth="2" strokeDasharray="4 4" />
                     <text x="242" y="155" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="400">Boundary</text>
                     {/* Question mark on S-wave at liquid */}
                     <circle cx="390" cy="110" r="18" fill="#2e1065" stroke="#a78bfa" strokeWidth="2" filter="url(#predictGlow)" />
                     <text x="390" y="117" textAnchor="middle" fill="#a78bfa" fontSize="18" fontWeight="700">?</text>
                  </svg>
               </div>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onClick={() => {
                           setPrediction(opt.id);
                           emitEvent('prediction_made', { prediction: opt.id });
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '16px',
                           padding: '20px',
                           borderRadius: design.radius.lg,
                           border: `2px solid ${prediction === opt.id ? design.colors.primary : design.colors.border}`,
                           background: prediction === opt.id ? design.colors.primaryMuted : design.colors.bgSecondary,
                           textAlign: 'left',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           zIndex: 10,
                        }}
                     >
                        <div style={{
                           width: '44px',
                           height: '44px',
                           borderRadius: design.radius.md,
                           background: prediction === opt.id ? design.colors.primary : design.colors.bgTertiary,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '18px',
                           fontWeight: 700,
                           color: prediction === opt.id ? 'white' : design.colors.textTertiary,
                        }}>
                           {opt.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                           <p style={{
                              fontWeight: 600,
                              fontSize: '15px',
                              color: prediction === opt.id ? design.colors.primary : design.colors.textPrimary,
                              marginBottom: '4px',
                           }}>
                              {opt.label}
                           </p>
                           <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                        </div>
                     </button>
                  ))}
               </div>
            </div>
            {renderBottomNav('hook', 'play', 'Test Your Prediction →', !prediction)}
         </div>
      );
   }

   // PLAY PHASE
   if (phase === 'play') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
                  overflowY: 'auto',
                  paddingBottom: '80px',
                  paddingTop: '44px'
               }}>
                  {renderWaveVisualization()}

                  {/* Comparison display */}
                  <div style={{
                     marginTop: '20px',
                     padding: '16px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                     maxWidth: '500px',
                     width: '100%'
                  }}>
                     <div style={{
                        fontSize: typo.small,
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                     }}>
                        Wave Comparison
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{
                           padding: '12px',
                           borderRadius: design.radius.md,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`
                        }}>
                           <div style={{
                              fontSize: typo.body,
                              fontWeight: 700,
                              color: design.colors.pWave,
                              marginBottom: '4px'
                           }}>
                              P-Wave
                           </div>
                           <div style={{ fontSize: typo.small, color: design.colors.textSecondary }}>
                              Compression • Faster • Works in all media
                           </div>
                           <div style={{ fontSize: typo.label, color: '#22c55e', fontWeight: 600, marginTop: '4px' }}>
                              ✓ Passes liquids
                           </div>
                        </div>
                        <div style={{
                           padding: '12px',
                           borderRadius: design.radius.md,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`
                        }}>
                           <div style={{
                              fontSize: typo.body,
                              fontWeight: 700,
                              color: design.colors.sWave,
                              marginBottom: '4px'
                           }}>
                              S-Wave
                           </div>
                           <div style={{ fontSize: typo.small, color: design.colors.textSecondary }}>
                              Shear • Slower • Solids only
                           </div>
                           <div style={{ fontSize: typo.label, color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                              ✗ Blocked by liquids
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  padding: '20px 24px',
                  background: design.colors.bgSecondary,
                  borderTop: `1px solid ${design.colors.border}`,
               }}>
                  {/* Wave Frequency Slider */}
                  <div style={{ marginBottom: '16px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label htmlFor="wave-frequency-slider" style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textSecondary }}>
                           Wave Frequency
                        </label>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: design.colors.pWave }}>
                           {waveFrequency} Hz
                        </span>
                     </div>
                     <div style={{ height: '20px', display: 'flex', alignItems: 'center' }}>
                        <input
                           id="wave-frequency-slider"
                           type="range"
                           min={1}
                           max={100}
                           step={1}
                           value={waveFrequency}
                           onChange={(e) => setWaveFrequency(parseInt(e.target.value))}
                           onInput={(e) => setWaveFrequency(parseInt((e.target as HTMLInputElement).value))}
                           style={{
                              width: '100%',
                              height: '20px',
                              cursor: 'pointer',
                              accentColor: '#3b82f6',
                              touchAction: 'pan-y',
                              WebkitAppearance: 'none' as const,
                           }}
                        />
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '12px', color: design.colors.textTertiary, fontWeight: 400 }}>1 Hz (slow)</span>
                        <span style={{ fontSize: '12px', color: design.colors.textTertiary, fontWeight: 400 }}>100 Hz (fast)</span>
                     </div>
                  </div>

                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.textTertiary,
                     marginBottom: '12px',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em',
                  }}>
                     Select Wave Type
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onClick={() => setWaveType('p')}
                        style={{
                           flex: 1,
                           padding: '16px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           zIndex: 10,
                        }}
                     >
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>← →</div>
                        <div style={{
                           color: waveType === 'p' ? design.colors.pWave : design.colors.textSecondary,
                           fontWeight: 700,
                           fontSize: '14px',
                        }}>
                           P-Wave
                        </div>
                        <div style={{ fontSize: '12px', color: design.colors.textTertiary, fontWeight: 400 }}>Compression</div>
                     </button>
                     <button
                        onClick={() => setWaveType('s')}
                        style={{
                           flex: 1,
                           padding: '16px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           zIndex: 10,
                        }}
                     >
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>↑ ↓</div>
                        <div style={{
                           color: waveType === 's' ? design.colors.sWave : design.colors.textSecondary,
                           fontWeight: 700,
                           fontSize: '14px',
                        }}>
                           S-Wave
                        </div>
                        <div style={{ fontSize: '12px', color: design.colors.textTertiary, fontWeight: 400 }}>Shear</div>
                     </button>
                  </div>

                  {renderButton(
                     isWaveActive ? '🌊 Wave Propagating...' : '🌊 Send Wave',
                     sendWave,
                     'primary',
                     isWaveActive,
                     true
                  )}

                  {/* Observation guidance */}
                  <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: design.radius.md, background: design.colors.bgTertiary, border: `1px solid ${design.colors.border}` }}>
                     <p style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>
                        What to Observe:
                     </p>
                     <p style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 400 }}>
                        Watch how the particles move when you send a wave. This visualization shows particle motion direction: P-waves compress horizontally, S-waves shear vertically. Notice the frequency indicator bar on the bottom tracking your slider position.
                     </p>
                  </div>

                  {/* Cause & Effect explanation */}
                  <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: design.radius.md, background: design.colors.bgTertiary, border: `1px solid ${design.colors.border}` }}>
                     <p style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>
                        Cause &amp; Effect:
                     </p>
                     <p style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 400 }}>
                        {waveType === 'p'
                           ? 'When you increase frequency, particles oscillate faster. Higher frequency causes more rapid compression cycles. P-waves used in earthquake early warning technology and industry applications — they travel through ALL materials.'
                           : 'When you increase frequency, S-waves shear faster side-to-side. Higher frequency affects perpendicular particle motion. This matters for engineering — S-waves are blocked by liquids, which is why they are used in industry for oil exploration!'}
                     </p>
                  </div>

                  {guidedMode && (
                     <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: design.radius.md,
                        background: design.colors.bgTertiary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <p style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 400 }}>
                           💡 Observe the particles! Adjust the frequency slider and try both wave types. Watch how motion direction differs between P and S waves.
                        </p>
                     </div>
                  )}
               </div>
            </div>
            {renderBottomNav('predict', 'review', 'See What You Learned →', !hasExperimented)}
         </div>
      );
   }

   // REVIEW PHASE
   if (phase === 'review') {
      const concepts = [
         {
            icon: '← →',
            title: 'P-Waves: Compression Waves',
            desc: 'Particles push and pull back-and-forth, parallel to the wave direction. Like pushing a slinky from one end.',
            color: design.colors.pWave,
         },
         {
            icon: '↑ ↓',
            title: 'S-Waves: Shear Waves',
            desc: 'Particles move side-to-side, perpendicular to the wave direction. Like shaking a slinky sideways.',
            color: design.colors.sWave,
         },
         {
            icon: '⚡',
            title: 'P = Primary (Faster)',
            desc: 'P-waves travel ~1.7x faster through rock (~6-8 km/s). They always arrive first at seismometers!',
            color: design.colors.primary,
         },
         {
            icon: '🐌',
            title: 'S = Secondary (Slower)',
            desc: 'S-waves travel slower (~3.5-4.5 km/s). They arrive after P-waves—the time gap helps locate earthquakes.',
            color: design.colors.secondary,
         },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 20px' : '32px 24px', paddingBottom: '80px', paddingTop: '44px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.success,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 4 • What You Discovered
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
               }}>
                  Two Types of Seismic Motion
               </h2>

               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '20px',
                  lineHeight: 1.6,
                  maxWidth: '560px',
                  fontWeight: 400,
               }}>
                  As you observed in the experiment, your prediction was tested by sending waves through different media. The results reveal a fundamental difference between these two wave types.
               </p>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '560px' }}>
                  {concepts.map((c, i) => (
                     <div key={i} style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '20px',
                        borderRadius: design.radius.lg,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{
                           width: '52px',
                           height: '52px',
                           borderRadius: design.radius.md,
                           background: `${c.color}20`,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '22px',
                           fontWeight: 700,
                           color: c.color,
                           flexShrink: 0,
                        }}>
                           {c.icon}
                        </div>
                        <div>
                           <p style={{
                              fontWeight: 700,
                              fontSize: '15px',
                              color: design.colors.textPrimary,
                              marginBottom: '6px',
                           }}>
                              {c.title}
                           </p>
                           <p style={{
                              fontSize: '13px',
                              color: design.colors.textSecondary,
                              lineHeight: 1.5,
                           }}>
                              {c.desc}
                           </p>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Key insight box */}
               <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  borderRadius: design.radius.lg,
                  background: design.colors.primaryMuted,
                  border: `1px solid ${design.colors.primary}40`,
                  maxWidth: '560px',
               }}>
                  <p style={{
                     fontSize: '14px',
                     fontWeight: 700,
                     color: design.colors.primary,
                     marginBottom: '8px',
                  }}>
                     🎯 Key Question
                  </p>
                  <p style={{
                     fontSize: '14px',
                     color: design.colors.textSecondary,
                     lineHeight: 1.6,
                  }}>
                     Both waves travel through solid rock. But what happens when they hit <strong style={{ color: design.colors.liquid }}>liquid</strong>? This is where the real discovery begins...
                  </p>
               </div>
            </div>
            {renderBottomNav('play', 'twist_predict', 'The Liquid Puzzle →')}
         </div>
      );
   }

   // TWIST_PREDICT PHASE
   if (phase === 'twist_predict') {
      const options = [
         { id: 'travels', label: 'Travels normally', desc: 'Waves work the same way in all materials', icon: '✓' },
         { id: 'slows', label: 'Slows down but continues', desc: 'Liquids just resist motion more than solids', icon: '🐌' },
         { id: 'blocked', label: 'Cannot travel through', desc: 'Something fundamental prevents propagation', icon: '🚫' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 20px' : '32px 24px', paddingBottom: '80px', paddingTop: '44px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 5 • The Twist
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
               }}>
                  What happens to S-waves in liquid?
               </h2>
               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '8px',
                  lineHeight: 1.6,
                  maxWidth: '520px',
                  fontWeight: 400,
               }}>
                  Scientists in the early 1900s noticed something strange: S-waves from earthquakes <em>never arrived</em> on the opposite side of Earth.
               </p>
               <p style={{
                  fontSize: '14px',
                  color: design.colors.textTertiary,
                  marginBottom: '20px',
                  maxWidth: '520px',
                  fontWeight: 400,
               }}>
                  This "S-wave shadow zone" was the key to discovering what's hidden 2,900 km beneath your feet...
               </p>

               {/* Static SVG: Earth cross-section showing S-wave shadow zone */}
               <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}`, maxWidth: '520px' }}>
                  <svg viewBox="0 0 520 170" width="100%" style={{ display: 'block' }}>
                     <defs>
                        <radialGradient id="earthGrad" cx="50%" cy="50%" r="50%">
                           <stop offset="0%" stopColor="#78350f" />
                           <stop offset="40%" stopColor="#451a03" />
                           <stop offset="70%" stopColor="#292524" />
                           <stop offset="100%" stopColor="#1c1917" />
                        </radialGradient>
                        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
                           <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                           <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
                        </radialGradient>
                        <filter id="twistGlow">
                           <feGaussianBlur stdDeviation="3" result="blur" />
                           <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                     </defs>
                     {/* Background */}
                     <rect width="520" height="170" fill="#09090b" />
                     {/* Earth body */}
                     <circle cx="260" cy="88" r="72" fill="url(#earthGrad)" stroke="#52525b" strokeWidth="1.5" />
                     {/* Liquid core */}
                     <circle cx="260" cy="88" r="35" fill="url(#coreGrad)" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.9" />
                     <text x="260" y="92" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">LIQUID</text>

                     {/* P-wave path through liquid core (curves through) */}
                     <path d="M 150 55 Q 200 75 260 88 Q 320 100 380 120" stroke="#fb923c" strokeWidth="2" fill="none" strokeDasharray="6 3" />
                     <polygon points="378,114 388,120 376,124" fill="#fb923c" />
                     <text x="140" y="50" fill="#fb923c" fontSize="11" fontWeight="700">P ✓</text>

                     {/* S-wave blocked at core boundary */}
                     <path d="M 150 125 L 225 115" stroke="#a78bfa" strokeWidth="2" fill="none" strokeDasharray="6 3" />
                     <circle cx="232" cy="113" r="10" fill="#2e1065" stroke="#a78bfa" strokeWidth="2" filter="url(#twistGlow)" />
                     <text x="232" y="118" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="700">✕</text>
                     <text x="140" y="140" fill="#a78bfa" fontSize="11" fontWeight="700">S ✕</text>

                     {/* Shadow zone indicator */}
                     <path d="M 350 50 Q 420 85 350 130" stroke="#ef4444" strokeWidth="1.5" fill="rgba(239,68,68,0.1)" strokeDasharray="3 2" />
                     <text x="420" y="85" fill="#ef4444" fontSize="11" fontWeight="700">Shadow</text>
                     <text x="420" y="98" fill="#ef4444" fontSize="11" fontWeight="700">Zone</text>

                     {/* Seismometer icons */}
                     <rect x="96" y="78" width="16" height="14" rx="2" fill="#22c55e" opacity="0.8" />
                     <text x="88" y="66" fill="rgba(148,163,184,0.7)" fontSize="10" fontWeight="400">Station</text>
                     <rect x="404" y="78" width="16" height="14" rx="2" fill="#ef4444" opacity="0.8" />
                     <text x="402" y="66" fill="rgba(148,163,184,0.7)" fontSize="10" fontWeight="400">No S</text>
                  </svg>
               </div>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onClick={() => {
                           setTwistPrediction(opt.id);
                           emitEvent('twist_prediction_made', { prediction: opt.id });
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '16px',
                           padding: '20px',
                           borderRadius: design.radius.lg,
                           border: `2px solid ${twistPrediction === opt.id ? design.colors.secondary : design.colors.border}`,
                           background: twistPrediction === opt.id ? design.colors.secondaryMuted : design.colors.bgSecondary,
                           textAlign: 'left',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           zIndex: 10,
                        }}
                     >
                        <div style={{
                           width: '44px',
                           height: '44px',
                           borderRadius: design.radius.md,
                           background: twistPrediction === opt.id ? design.colors.secondary : design.colors.bgTertiary,
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '20px',
                           color: twistPrediction === opt.id ? 'white' : design.colors.textTertiary,
                        }}>
                           {opt.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                           <p style={{
                              fontWeight: 600,
                              fontSize: '15px',
                              color: twistPrediction === opt.id ? design.colors.secondary : design.colors.textPrimary,
                              marginBottom: '4px',
                           }}>
                              {opt.label}
                           </p>
                           <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                        </div>
                     </button>
                  ))}
               </div>
            </div>
            {renderBottomNav('review', 'twist_play', 'Test in Liquid →', !twistPrediction)}
         </div>
      );
   }

   // TWIST_PLAY PHASE
   if (phase === 'twist_play') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
                  overflowY: 'auto',
                  paddingBottom: '80px',
                  paddingTop: '44px'
               }}>
                  {renderWaveVisualization()}

                  {/* Comparison: Solid vs Liquid behavior */}
                  <div style={{
                     marginTop: '20px',
                     padding: '16px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                     maxWidth: '500px',
                     width: '100%'
                  }}>
                     <div style={{
                        fontSize: typo.small,
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                     }}>
                        Medium Comparison
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{
                           padding: '12px',
                           borderRadius: design.radius.md,
                           background: medium === 'solid' ? `${design.colors.solid}15` : design.colors.bgTertiary,
                           border: `2px solid ${medium === 'solid' ? design.colors.solid : design.colors.border}`
                        }}>
                           <div style={{
                              fontSize: typo.body,
                              fontWeight: 700,
                              color: design.colors.textPrimary,
                              marginBottom: '4px'
                           }}>
                              Solid Rock
                           </div>
                           <div style={{ fontSize: typo.small, color: design.colors.textSecondary }}>
                              Both P & S waves propagate
                           </div>
                        </div>
                        <div style={{
                           padding: '12px',
                           borderRadius: design.radius.md,
                           background: medium === 'liquid' ? `${design.colors.liquid}15` : design.colors.bgTertiary,
                           border: `2px solid ${medium === 'liquid' ? design.colors.liquid : design.colors.border}`
                        }}>
                           <div style={{
                              fontSize: typo.body,
                              fontWeight: 700,
                              color: design.colors.liquid,
                              marginBottom: '4px'
                           }}>
                              Liquid
                           </div>
                           <div style={{ fontSize: typo.small, color: design.colors.textSecondary }}>
                              Only P-waves • S-waves blocked
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Controls */}
               <div style={{
                  padding: '20px 24px',
                  background: design.colors.bgSecondary,
                  borderTop: `1px solid ${design.colors.border}`,
               }}>
                  {/* Medium selector */}
                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.textTertiary,
                     marginBottom: '8px',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em',
                  }}>
                     Select Medium
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                     <button
                        onClick={() => setMedium('solid')}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${medium === 'solid' ? design.colors.solid : design.colors.border}`,
                           background: medium === 'solid' ? `${design.colors.solid}15` : design.colors.bgTertiary,
                           color: medium === 'solid' ? design.colors.textPrimary : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                           zIndex: 10,
                        }}
                     >
                        🪨 Solid Rock
                     </button>
                     <button
                        onClick={() => setMedium('liquid')}
                        style={{
                           flex: 1,
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${medium === 'liquid' ? design.colors.liquid : design.colors.border}`,
                           background: medium === 'liquid' ? `${design.colors.liquid}15` : design.colors.bgTertiary,
                           color: medium === 'liquid' ? design.colors.liquid : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                           zIndex: 10,
                        }}
                     >
                        💧 Liquid
                     </button>
                  </div>

                  {/* Wave type selector */}
                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.textTertiary,
                     marginBottom: '8px',
                     textTransform: 'uppercase',
                     letterSpacing: '0.05em',
                  }}>
                     Wave Type
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <button
                        onClick={() => setWaveType('p')}
                        style={{
                           flex: 1,
                           padding: '12px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 'p' ? design.colors.pWave : design.colors.border}`,
                           background: waveType === 'p' ? `${design.colors.pWave}20` : design.colors.bgTertiary,
                           color: waveType === 'p' ? design.colors.pWave : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                           zIndex: 10,
                        }}
                     >
                        ← → P-Wave
                     </button>
                     <button
                        onClick={() => setWaveType('s')}
                        style={{
                           flex: 1,
                           padding: '12px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${waveType === 's' ? design.colors.sWave : design.colors.border}`,
                           background: waveType === 's' ? `${design.colors.sWave}20` : design.colors.bgTertiary,
                           color: waveType === 's' ? design.colors.sWave : design.colors.textSecondary,
                           fontWeight: 600,
                           fontSize: '14px',
                           cursor: 'pointer',
                           zIndex: 10,
                        }}
                     >
                        ↑ ↓ S-Wave
                     </button>
                  </div>

                  {renderButton(
                     isWaveActive ? '🌊 Wave Propagating...' : '🌊 Send Wave',
                     sendWave,
                     'primary',
                     isWaveActive,
                     true
                  )}

                  {/* S-wave in liquid warning */}
                  {waveType === 's' && medium === 'liquid' && (
                     <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: design.radius.md,
                        background: design.colors.dangerMuted,
                        border: `1px solid ${design.colors.danger}40`,
                     }}>
                        <p style={{ fontSize: '13px', color: design.colors.danger, fontWeight: 600 }}>
                           ⚠️ S-waves cannot propagate through liquids!
                        </p>
                     </div>
                  )}

                  {guidedMode && !hasSentSWaveInLiquid && (
                     <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        borderRadius: design.radius.md,
                        background: design.colors.bgTertiary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>
                           💡 Try sending an S-wave through liquid to see what happens!
                        </p>
                     </div>
                  )}
               </div>
            </div>
            {renderBottomNav('twist_predict', 'twist_review', 'Understand Why →', !hasSentSWaveInLiquid)}
         </div>
      );
   }

   // TWIST_REVIEW PHASE
   if (phase === 'twist_review') {
      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px 20px' : '32px 24px', paddingBottom: '80px', paddingTop: '44px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 7 • The Key Insight
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  letterSpacing: '-0.02em',
               }}>
                  Why Liquids Block S-Waves
               </h2>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '560px' }}>
                  {/* Main insight */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.secondaryMuted,
                     border: `1px solid ${design.colors.secondary}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.secondary,
                        marginBottom: '12px',
                     }}>
                        🔬 The Fundamental Difference
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        S-waves need materials that <strong style={{ color: design.colors.textPrimary }}>"spring back"</strong> when pushed sideways. This is called <em>shear stress resistance</em>. When you push water sideways, it just <strong style={{ color: design.colors.liquid }}>flows</strong>—there's no restoring force to create a wave!
                     </p>
                  </div>

                  {/* P-wave explanation */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.primaryMuted,
                     border: `1px solid ${design.colors.primary}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.pWave,
                        marginBottom: '12px',
                     }}>
                        ✓ Why P-Waves Work Everywhere
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        P-waves use <strong style={{ color: design.colors.textPrimary }}>compression</strong>—pushing particles together and apart. Both solids AND liquids resist being compressed. That's why P-waves travel through Earth's liquid outer core!
                     </p>
                  </div>

                  {/* Earth discovery */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.successMuted,
                     border: `1px solid ${design.colors.success}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.success,
                        marginBottom: '12px',
                     }}>
                        🌍 How We Discovered Earth's Liquid Core
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        In 1906, geologist Richard Oldham noticed that S-waves <strong style={{ color: design.colors.textPrimary }}>never arrived</strong> at stations on the opposite side of Earth from an earthquake. This "S-wave shadow zone" proved the outer core is liquid—without anyone ever seeing it!
                     </p>
                  </div>

                  {/* Formula box */}
                  <div style={{
                     padding: '20px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                     textAlign: 'center',
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                     }}>
                        Key Physics
                     </p>
                     <p style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: design.colors.textPrimary,
                        fontFamily: 'monospace',
                     }}>
                        Shear Wave Speed = √(Shear Modulus / Density)
                     </p>
                     <p style={{
                        fontSize: '13px',
                        color: design.colors.textSecondary,
                        marginTop: '8px',
                     }}>
                        Liquids have shear modulus ≈ 0, so S-wave speed → 0
                     </p>
                  </div>
               </div>
            </div>
            {renderBottomNav('twist_play', 'transfer', 'Real-World Applications →')}
         </div>
      );
   }

   // TRANSFER PHASE - GOLD STANDARD with completedApps tracking
   if (phase === 'transfer') {
      const app = realWorldApps[activeApp];
      const allAppsCompleted = completedApps.size >= realWorldApps.length;

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {/* Tab navigation */}
               <div style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '16px',
                  borderBottom: `1px solid ${design.colors.border}`,
                  overflowX: 'auto',
                  background: design.colors.bgSecondary,
               }}>
                  {realWorldApps.map((a, i) => (
                     <button
                        key={i}
                        onClick={() => setActiveApp(i)}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '8px',
                           padding: '10px 16px',
                           borderRadius: design.radius.md,
                           border: 'none',
                           background: i === activeApp ? a.color : design.colors.bgTertiary,
                           color: i === activeApp ? 'white' : design.colors.textSecondary,
                           fontSize: '13px',
                           fontWeight: 600,
                           cursor: 'pointer',
                           whiteSpace: 'nowrap',
                           transition: 'all 0.2s',
                           zIndex: 10,
                        }}
                     >
                        <span>{a.icon}</span>
                        <span>{a.title.split(' ')[0]}</span>
                        {completedApps.has(i) && (
                           <span style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: i === activeApp ? 'rgba(255,255,255,0.3)' : design.colors.success,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                           }}>
                              ✓
                           </span>
                        )}
                     </button>
                  ))}
               </div>

               {/* Content area - scrollable with proper padding */}
               <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px', paddingTop: '48px' }}>
                  {/* App header */}
                  <div style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '16px',
                     marginBottom: '20px',
                  }}>
                     <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: design.radius.lg,
                        background: `${app.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                     }}>
                        {app.icon}
                     </div>
                     <div>
                        <h3 style={{
                           fontSize: '22px',
                           fontWeight: 800,
                           color: '#ffffff',
                           marginBottom: '4px',
                        }}>
                           {app.title}
                        </h3>
                        <p style={{
                           fontSize: '14px',
                           color: app.color,
                           fontWeight: 600,
                        }}>
                           {app.tagline}
                        </p>
                     </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                     {app.stats.map((stat, i) => (
                        <div key={i} style={{
                           flex: '1',
                           minWidth: '80px',
                           padding: '12px',
                           borderRadius: design.radius.md,
                           background: design.colors.bgSecondary,
                           border: `1px solid ${design.colors.border}`,
                           textAlign: 'center',
                        }}>
                           <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                           <div style={{ fontSize: '14px', fontWeight: 700, color: app.color, marginBottom: '2px' }}>{stat.value}</div>
                           <div style={{ fontSize: '11px', color: 'rgba(148,163,184,0.7)', fontWeight: 400 }}>{stat.label}</div>
                        </div>
                     ))}
                  </div>

                  {/* Description */}
                  <p style={{
                     fontSize: '15px',
                     color: design.colors.textSecondary,
                     lineHeight: 1.7,
                     marginBottom: '16px',
                     fontWeight: 400,
                  }}>
                     {app.description}
                  </p>

                  {/* Connection to physics */}
                  <div style={{
                     padding: '16px',
                     borderRadius: design.radius.md,
                     background: `${app.color}10`,
                     border: `1px solid ${app.color}40`,
                     marginBottom: '16px',
                  }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: app.color, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Physics Connection
                     </p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                        {app.connection}
                     </p>
                  </div>

                  {/* How It Works */}
                  <div style={{
                     padding: '16px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                     marginBottom: '16px',
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                     }}>
                        How It Works
                     </p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                        {app.howItWorks}
                     </p>
                  </div>

                  {/* Examples */}
                  <div style={{ marginBottom: '16px' }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textTertiary, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Real Examples
                     </p>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {app.examples.map((ex, i) => (
                           <span key={i} style={{
                              padding: '4px 10px',
                              borderRadius: design.radius.full,
                              background: design.colors.bgElevated,
                              border: `1px solid ${design.colors.border}`,
                              fontSize: '12px',
                              color: design.colors.textSecondary,
                              fontWeight: 400,
                           }}>
                              {ex}
                           </span>
                        ))}
                     </div>
                  </div>

                  {/* Future Impact */}
                  <div style={{
                     padding: '14px 16px',
                     borderRadius: design.radius.md,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                     marginBottom: '16px',
                  }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Future Impact
                     </p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                        {app.futureImpact}
                     </p>
                  </div>

                  {/* Next Application button - advances through real world applications */}
                  {activeApp < realWorldApps.length - 1 && (
                     <button
                        onClick={() => {
                           const newCompleted = new Set(completedApps);
                           newCompleted.add(activeApp);
                           setCompletedApps(newCompleted);
                           setActiveApp(activeApp + 1);
                           emitEvent('app_explored', { appIndex: activeApp, appTitle: app.title });
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           gap: '8px',
                           width: '100%',
                           marginTop: '20px',
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: 'none',
                           background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`,
                           color: 'white',
                           fontSize: '14px',
                           fontWeight: 600,
                           cursor: 'pointer',
                           boxShadow: design.shadow.md,
                           zIndex: 10,
                        }}
                     >
                        Next Application →
                     </button>
                  )}

                  {/* Mark last app as complete */}
                  {activeApp === realWorldApps.length - 1 && !completedApps.has(activeApp) && (
                     <button
                        onClick={() => {
                           const newCompleted = new Set(completedApps);
                           newCompleted.add(activeApp);
                           setCompletedApps(newCompleted);
                           emitEvent('app_explored', { appIndex: activeApp, appTitle: app.title });
                        }}
                        style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           gap: '8px',
                           width: '100%',
                           marginTop: '20px',
                           padding: '14px',
                           borderRadius: design.radius.md,
                           border: `2px solid ${app.color}`,
                           background: `${app.color}15`,
                           color: app.color,
                           fontSize: '14px',
                           fontWeight: 600,
                           cursor: 'pointer',
                           zIndex: 10,
                        }}
                     >
                        ✓ Complete All Applications
                     </button>
                  )}

                  {/* Progress indicator */}
                  <div style={{
                     marginTop: '20px',
                     padding: '16px',
                     borderRadius: design.radius.md,
                     background: design.colors.bgTertiary,
                     textAlign: 'center',
                  }}>
                     <p style={{
                        fontSize: '13px',
                        color: completedApps.size >= realWorldApps.length ? design.colors.success : design.colors.textSecondary,
                        fontWeight: 600,
                     }}>
                        {completedApps.size >= realWorldApps.length
                           ? '✓ All applications reviewed! Ready for quiz.'
                           : `Progress: ${completedApps.size} of ${realWorldApps.length} applications reviewed`}
                     </p>
                  </div>
               </div>
            </div>
            {renderBottomNav('twist_review', 'test', 'Continue to Knowledge Test →', completedApps.size < realWorldApps.length)}
         </div>
      );
   }

   // TEST PHASE
   if (phase === 'test') {
      const q = testQuestions[testIndex];
      const isLast = testIndex === testQuestions.length - 1;

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px' : '24px', paddingBottom: '80px', paddingTop: '44px' }}>
               {/* Question header */}
               <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
               }}>
                  <p style={{
                     fontSize: '13px',
                     fontWeight: 700,
                     color: design.colors.primary,
                  }}>
                     Question {testIndex + 1} of {testQuestions.length}
                  </p>
                  <div style={{
                     padding: '6px 12px',
                     borderRadius: design.radius.full,
                     background: design.colors.successMuted,
                     border: `1px solid ${design.colors.success}40`,
                  }}>
                     <p style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: design.colors.success,
                     }}>
                        Score: {testScore}/{testQuestions.length}
                     </p>
                  </div>
               </div>

               {/* Scenario context */}
               {'scenario' in q && q.scenario && (
                  <div style={{
                     marginBottom: '16px',
                     padding: '14px 16px',
                     borderRadius: design.radius.md,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                  }}>
                     <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Scenario
                     </p>
                     <p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                        {q.scenario}
                     </p>
                  </div>
               )}

               {/* Question */}
               <h3 style={{
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: 700,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  lineHeight: 1.4,
               }}>
                  {q.question}
               </h3>

               {/* Answer options */}
               <div style={{ display: 'grid', gap: '12px' }}>
                  {q.options.map((opt, i) => {
                     const isCorrect = opt.correct;
                     const isSelected = i === selectedAnswer;
                     let bg = design.colors.bgSecondary;
                     let border = design.colors.border;
                     let textColor = design.colors.textPrimary;

                     if (selectedAnswer !== null) {
                        if (isCorrect) {
                           bg = design.colors.successMuted;
                           border = design.colors.success;
                           textColor = design.colors.success;
                        } else if (isSelected) {
                           bg = design.colors.dangerMuted;
                           border = design.colors.danger;
                           textColor = design.colors.danger;
                        }
                     }

                     return (
                        <button
                           key={i}
                           onClick={() => {
                              if (selectedAnswer !== null) return;
                              setSelectedAnswer(i);
                              setShowExplanation(true);
                              if (isCorrect) setTestScore(s => s + 1);
                              emitEvent('test_answered', { questionIndex: testIndex, answer: opt.text, isCorrect });
                           }}
                           style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '16px',
                              borderRadius: design.radius.md,
                              border: `2px solid ${border}`,
                              background: bg,
                              textAlign: 'left',
                              cursor: selectedAnswer === null ? 'pointer' : 'default',
                              transition: 'all 0.2s',
                              zIndex: 10,
                           }}
                        >
                           <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: selectedAnswer !== null && isCorrect ? design.colors.success : design.colors.bgTertiary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: selectedAnswer !== null && isCorrect ? 'white' : design.colors.textSecondary,
                              flexShrink: 0,
                           }}>
                              {selectedAnswer !== null && isCorrect ? '✓' : String.fromCharCode(65 + i)}
                           </div>
                           <p style={{ fontSize: '14px', color: textColor, lineHeight: 1.4 }}>{opt.text}</p>
                        </button>
                     );
                  })}
               </div>

               {/* Explanation */}
               {showExplanation && (
                  <div style={{
                     marginTop: '20px',
                     padding: '20px',
                     borderRadius: design.radius.lg,
                     background: design.colors.primaryMuted,
                     border: `1px solid ${design.colors.primary}40`,
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.primary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                     }}>
                        Explanation
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.6,
                     }}>
                        {q.explanation}
                     </p>
                  </div>
               )}
            </div>

            {/* Next button */}
            {showExplanation && (
               <div style={{
                  padding: '20px 24px',
                  borderTop: `1px solid ${design.colors.border}`,
                  background: design.colors.bgSecondary,
               }}>
                  {renderButton(
                     isLast ? 'See Results →' : 'Next Question →',
                     () => {
                        if (isLast) {
                           emitEvent('test_completed', { score: testScore, maxScore: testQuestions.length });
                           goToPhase('mastery');
                        } else {
                           setTestIndex(i => i + 1);
                           setSelectedAnswer(null);
                           setShowExplanation(false);
                        }
                     },
                     'primary',
                     false,
                     true
                  )}
               </div>
            )}
         </div>
      );
   }

   // MASTERY PHASE
   if (phase === 'mastery') {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const isPassing = percentage >= 70;

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #0a0a12 100%)`,
            fontFamily: design.font.sans,
            position: 'relative',
            overflow: 'hidden',
         }}>
            {/* Confetti animation */}
            {isPassing && Array.from({ length: 50 }).map((_, i) => (
               <div
                  key={i}
                  style={{
                     position: 'absolute',
                     left: `${Math.random() * 100}%`,
                     top: '-20px',
                     width: `${8 + Math.random() * 8}px`,
                     height: `${8 + Math.random() * 8}px`,
                     background: [design.colors.primary, design.colors.secondary, design.colors.success, design.colors.warning, design.colors.pWave, design.colors.sWave][i % 6],
                     borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                     animation: `confetti ${2 + Math.random() * 2}s ease-out ${Math.random() * 2}s infinite`,
                  }}
               />
            ))}
            <style>{`
               @keyframes confetti {
                  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
               }
            `}</style>

            {renderProgressBar()}
            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: '32px 24px',
               textAlign: 'center',
            }}>
               {/* Trophy icon */}
               <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: isPassing
                     ? `linear-gradient(135deg, ${design.colors.primary} 0%, #c2410c 100%)`
                     : design.colors.bgTertiary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: isPassing ? design.shadow.glow(design.colors.primary) : 'none',
               }}>
                  <span style={{ fontSize: '48px' }}>{isPassing ? '🏆' : '📚'}</span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '28px' : '36px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '8px',
               }}>
                  {isPassing ? 'Seismic Master!' : 'Keep Learning!'}
               </h1>

               <p style={{
                  fontSize: '18px',
                  color: design.colors.textSecondary,
                  marginBottom: '32px',
               }}>
                  You scored{' '}
                  <span style={{ color: isPassing ? design.colors.success : design.colors.warning, fontWeight: 700 }}>
                     {testScore}/{testQuestions.length}
                  </span>
                  {' '}({percentage}%)
               </p>

               {/* Key learnings */}
               <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  maxWidth: '400px',
                  width: '100%',
                  marginBottom: '32px',
               }}>
                  {[
                     { icon: '← →', label: 'P = Compression' },
                     { icon: '↑ ↓', label: 'S = Shear' },
                     { icon: '💧', label: 'No S in liquids' },
                     { icon: '🌍', label: 'Liquid outer core' },
                  ].map((item, i) => (
                     <div key={i} style={{
                        padding: '16px',
                        borderRadius: design.radius.md,
                        background: design.colors.bgSecondary,
                        border: `1px solid ${design.colors.border}`,
                     }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                     </div>
                  ))}
               </div>

               {/* Action buttons */}
               <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {!isPassing && renderButton('Try Again', () => {
                     setTestIndex(0);
                     setTestScore(0);
                     setSelectedAnswer(null);
                     setShowExplanation(false);
                     goToPhase('test');
                  }, 'secondary')}
                  {renderButton(
                     isPassing ? 'Complete Lesson ✓' : 'Complete Anyway',
                     () => emitEvent('mastery_achieved', { score: testScore, maxScore: testQuestions.length, percentage })
                  )}
               </div>
            </div>
         </div>
      );
   }

   return null;
};

export default PWavesSWavesRenderer;
