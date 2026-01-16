'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// PHOTOELECTRIC EFFECT RENDERER - Premium Apple/Airbnb Design
// Gold Standard: Sequential transfer navigation with completedApps tracking
// Einstein's Nobel Prize discovery - light as quantized photons
// ============================================================================

export interface GameEvent {
   eventType: 'phase_changed' | 'prediction_made' | 'experiment_action' | 'parameter_changed' |
              'answer_submitted' | 'hint_requested' | 'milestone_reached' | 'game_completed' |
              'game_started' | 'visual_state_update' | 'test_completed' | 'lesson_completed' |
              'twist_prediction_made' | 'wavelength_changed' | 'intensity_changed' | 'metal_changed';
   gameType: string;
   gameTitle: string;
   details: Record<string, unknown>;
   timestamp: number;
}

interface PhotoelectricEffectRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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
      primary: '#f59e0b',
      primaryHover: '#d97706',
      primaryMuted: '#451a03',
      secondary: '#8b5cf6',
      secondaryMuted: '#2e1065',
      success: '#22c55e',
      successMuted: '#052e16',
      warning: '#eab308',
      warningMuted: '#422006',
      danger: '#ef4444',
      dangerMuted: '#450a0a',
      electron: '#38bdf8',
      photon: '#fbbf24',
      uvLight: '#a78bfa',
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

const PhotoelectricEffectRenderer: React.FC<PhotoelectricEffectRendererProps> = ({ onGameEvent, gamePhase }) => {
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

   // Core state
   const [phase, setPhase] = useState<Phase>(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
      return 'hook';
   });
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [wavelength, setWavelength] = useState(400); // nm
   const [intensity, setIntensity] = useState(70); // %
   const [workFunction, setWorkFunction] = useState(2.3); // eV (Sodium)
   const [hasExperimented, setHasExperimented] = useState(false);
   const [hasTestedIntensity, setHasTestedIntensity] = useState(false);
   const [guidedMode, setGuidedMode] = useState(true);
   const [isMobile, setIsMobile] = useState(false);

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

   // Navigation lock - prevents double-clicks
   const navigationLockRef = useRef(false);

   // Physics constants
   const h = 4.136e-15; // Planck's constant in eV·s
   const c = 3e8; // Speed of light in m/s

   // Calculated values
   const photonEnergy = (h * c) / (wavelength * 1e-9);
   const maxKE = Math.max(0, photonEnergy - workFunction);
   const emissionOccurs = photonEnergy >= workFunction;
   const thresholdWavelength = (h * c) / (workFunction * 1e-9);

   // Mobile detection
   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   // Sync with external phase
   useEffect(() => {
      if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
         setPhase(gamePhase as Phase);
      }
   }, [gamePhase]);

   // Animation loop
   useEffect(() => {
      const animate = () => {
         timeRef.current += 0.05;
         animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
         if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
   }, []);

   // Event emitter
   const emit = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
      onGameEvent?.({
         eventType,
         gameType: 'photoelectric_effect',
         gameTitle: 'Photoelectric Effect',
         details: { phase, guidedMode, wavelength, intensity, photonEnergy, maxKE, emissionOccurs, ...details },
         timestamp: Date.now()
      });
   }, [onGameEvent, phase, guidedMode, wavelength, intensity, photonEnergy, maxKE, emissionOccurs]);

   // Debounced navigation
   const goToPhase = useCallback((newPhase: Phase) => {
      if (navigationLockRef.current) return;
      navigationLockRef.current = true;
      setPhase(newPhase);
      emit('phase_changed', { newPhase });
      setTimeout(() => { navigationLockRef.current = false; }, 400);
   }, [emit]);

   // Wavelength to visible color
   const wavelengthToColor = (wl: number): string => {
      if (wl < 380) return design.colors.uvLight; // UV
      if (wl < 450) return '#3b82f6'; // Blue
      if (wl < 495) return '#06b6d4'; // Cyan
      if (wl < 570) return '#22c55e'; // Green
      if (wl < 590) return '#eab308'; // Yellow
      if (wl < 620) return '#f97316'; // Orange
      return '#ef4444'; // Red
   };

   // Test questions - 10 comprehensive questions
   const testQuestions = [
      { q: 'Red light shines on a metal surface but no electrons escape. You switch to blue light of the same intensity. What happens?', opts: ['Still no electrons - color doesn\'t matter', 'Electrons are emitted because blue has higher frequency', 'Same number of electrons, but slower', 'Cannot determine without knowing the metal'], correct: 1, explain: 'Blue light has higher frequency, meaning each photon carries more energy (E = hf). If blue photon energy exceeds the work function, electrons will be emitted even though red couldn\'t do it.' },
      { q: 'You double the intensity of UV light hitting a metal surface. How does this affect the ejected electrons?', opts: ['Electrons move twice as fast', 'Twice as many electrons are emitted at the same speed', 'No change at all', 'Electrons have more kinetic energy'], correct: 1, explain: 'Doubling intensity means twice as many photons per second. Each photon can eject one electron, so you get twice as many electrons. But each photon has the same energy (E = hf), so electron speed is unchanged.' },
      { q: 'Einstein won the 1921 Nobel Prize for explaining the photoelectric effect. What was his key insight?', opts: ['Light travels in waves like water', 'Light consists of discrete packets called photons', 'Electrons have wave properties', 'Energy is continuously distributed'], correct: 1, explain: 'Einstein proposed that light energy comes in discrete quanta (photons), each with energy E = hf. This explained why only frequency (not intensity) determines whether electrons can escape.' },
      { q: 'Metal A has work function 2.0 eV. Metal B has work function 4.5 eV. You shine 3.0 eV photons on both. What happens?', opts: ['Both metals emit electrons', 'Neither metal emits electrons', 'Only Metal A emits electrons', 'Only Metal B emits electrons'], correct: 2, explain: 'Electrons escape only when photon energy exceeds work function. For Metal A: 3.0 > 2.0 eV (emission). For Metal B: 3.0 < 4.5 eV (no emission). Metal A emits electrons with 1.0 eV kinetic energy.' },
      { q: 'Classical physics predicted that brighter light should eject faster electrons. Why was this prediction wrong?', opts: ['Light doesn\'t interact with electrons', 'Energy comes in discrete packets, not continuous waves', 'Metals absorb all light energy as heat', 'Electrons are too heavy to accelerate'], correct: 1, explain: 'Classical wave theory assumed energy accumulates continuously, so brighter = more total energy = faster electrons. But light comes in photons with fixed energy E = hf. More photons (brighter) gives more electrons, but each photon\'s energy depends only on frequency.' },
      { q: 'The maximum kinetic energy of ejected electrons is measured as 1.5 eV. The metal\'s work function is 2.3 eV. What was the photon energy?', opts: ['0.8 eV', '2.3 eV', '3.8 eV', '1.5 eV'], correct: 2, explain: 'Using Einstein\'s equation: E_photon = Work Function + KE_max. So E_photon = 2.3 + 1.5 = 3.8 eV. The photon energy minus work function equals the leftover kinetic energy.' },
      { q: 'Why do solar cells need photons with energy greater than the semiconductor\'s band gap?', opts: ['To heat up the material', 'To free electrons from bound states', 'To make the cell vibrate', 'To change the cell\'s color'], correct: 1, explain: 'Just like the photoelectric effect, electrons in solar cells need enough energy to escape their bound states. The band gap is analogous to the work function - photons with less energy cannot free electrons.' },
      { q: 'Night vision devices amplify starlight using the photoelectric effect. How do they work?', opts: ['They heat up the light', 'One photon triggers a cascade of electrons', 'They slow down light', 'They change infrared to visible'], correct: 1, explain: 'Photomultiplier tubes use the photoelectric effect: one photon releases one electron, which is accelerated and releases more electrons on impact, creating a cascade that amplifies the original signal millions of times.' },
      { q: 'The threshold frequency for a certain metal is 5 x 10^14 Hz. What happens if you shine light at 6 x 10^14 Hz?', opts: ['No emission - frequency too high', 'Electrons are emitted with kinetic energy', 'Light passes through the metal', 'Electrons are absorbed'], correct: 1, explain: 'Since 6 x 10^14 Hz > threshold of 5 x 10^14 Hz, each photon has enough energy to exceed the work function. Electrons will be emitted, and the excess energy (E_photon - Work Function) becomes kinetic energy.' },
      { q: 'In a digital camera sensor, what determines how bright each pixel appears?', opts: ['The color of light hitting it', 'The number of photons hitting that pixel', 'The temperature of the sensor', 'The size of the camera'], correct: 1, explain: 'Each photon hitting a pixel can free one electron (if it has enough energy). More photons = more freed electrons = stronger electrical signal = brighter pixel in the final image.' }
   ];

   // Real-world applications - 4 detailed applications
   const applications = [
      {
         icon: '☀️',
         title: 'Solar Cells',
         description: 'Photovoltaic cells convert sunlight directly into electricity using the photoelectric effect. When photons with energy greater than the semiconductor\'s band gap hit the cell, they free electrons that flow as electrical current.',
         details: [
            'Silicon band gap: 1.1 eV (requires wavelength < 1100nm)',
            'Photons with less energy pass through without absorption',
            'Multi-junction cells use different band gaps to capture more spectrum',
            'Global solar capacity exceeded 1 terawatt in 2022'
         ],
         stat: '1+ Terawatt global capacity',
         color: design.colors.primary
      },
      {
         icon: '📷',
         title: 'Digital Camera Sensors',
         description: 'CCD and CMOS sensors are arrays of photoelectric cells. Each pixel converts incoming photons into electrons, measuring light intensity across millions of points to create digital images.',
         details: [
            'Each pixel is a tiny photodiode (photoelectric cell)',
            'More photons = more electrons = brighter pixel',
            'Color filters (Bayer pattern) separate R, G, B channels',
            'Low-light performance depends on quantum efficiency'
         ],
         stat: '200+ Megapixel sensors',
         color: design.colors.secondary
      },
      {
         icon: '🌙',
         title: 'Night Vision',
         description: 'Photomultiplier tubes amplify tiny amounts of starlight by cascading the photoelectric effect. One photon releases one electron, which triggers more electrons in a chain reaction, amplifying light up to 50,000x.',
         details: [
            'Photocathode converts photons to electrons',
            'Microchannel plate multiplies electrons exponentially',
            'Each stage multiplies electron count 10-100x',
            'Gen 3+ devices can see in starlight only'
         ],
         stat: '50,000x light amplification',
         color: design.colors.success
      },
      {
         icon: '🚪',
         title: 'Light Sensors',
         description: 'Automatic doors, elevator safety systems, and industrial automation use photoelectric sensors. When you break a light beam, fewer photons reach the detector, triggering the response.',
         details: [
            'Emitter sends infrared or visible light beam',
            'Receiver detects beam using photoelectric effect',
            'Broken beam = fewer photons = signal change',
            'Response time: milliseconds or faster'
         ],
         stat: 'Used in 5M+ automatic doors',
         color: design.colors.warning
      }
   ];

   // Metal options for experiments
   const metals = [
      { name: 'Sodium', workFunction: 2.3 },
      { name: 'Calcium', workFunction: 3.0 },
      { name: 'Zinc', workFunction: 4.3 },
      { name: 'Copper', workFunction: 4.7 },
      { name: 'Platinum', workFunction: 5.6 }
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
            onMouseDown={(e) => {
               e.preventDefault();
               if (!disabled && !navigationLockRef.current) {
                  navigationLockRef.current = true;
                  onClick();
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
               }
            }}
            style={{ ...baseStyle, ...variants[variant] }}
         >
            {text}
         </button>
      );
   };

   const renderProgressBar = () => {
      const currentIdx = validPhases.indexOf(phase);
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
            {validPhases.map((_, i) => (
               <div
                  key={i}
                  style={{
                     width: i === currentIdx ? '24px' : '8px',
                     height: '8px',
                     borderRadius: design.radius.full,
                     background: i < currentIdx ? design.colors.success : i === currentIdx ? design.colors.primary : design.colors.bgElevated,
                     transition: 'all 0.3s ease',
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

   // Photoelectric lab visualization
   const renderPhotoelectricLab = () => {
      const lightColor = wavelengthToColor(wavelength);
      const numPhotons = Math.floor(intensity / 12);
      const numElectrons = emissionOccurs ? numPhotons : 0;

      return (
         <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%', maxHeight: '320px' }}>
            <defs>
               <linearGradient id="metalPlate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#78716c" />
                  <stop offset="30%" stopColor="#a8a29e" />
                  <stop offset="60%" stopColor="#78716c" />
                  <stop offset="100%" stopColor="#57534e" />
               </linearGradient>
               <radialGradient id="photonGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={lightColor} stopOpacity="1" />
                  <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
               </radialGradient>
               <radialGradient id="electronGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={design.colors.electron} stopOpacity="1" />
                  <stop offset="100%" stopColor={design.colors.electron} stopOpacity="0" />
               </radialGradient>
               <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                     <feMergeNode in="blur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>
            </defs>

            {/* Background */}
            <rect width="600" height="320" fill="#0a0a12" />

            {/* Title */}
            <text x="300" y="28" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 700, fill: design.colors.textPrimary }}>
               Photoelectric Effect Simulator
            </text>

            {/* Vacuum chamber */}
            <rect x="60" y="50" width="480" height="220" rx="16"
               fill="#0f172a" stroke={design.colors.border} strokeWidth="2" />
            <text x="300" y="68" textAnchor="middle"
               style={{ fontSize: '10px', fontWeight: 600, fill: design.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               Vacuum Chamber
            </text>

            {/* Light source */}
            <g transform="translate(100, 160)">
               <rect x="-20" y="-50" width="40" height="100" rx="6" fill="#374151" stroke="#4b5563" strokeWidth="2" />
               <circle cx="0" cy="0" r="18" fill={lightColor} filter="url(#glow)" opacity="0.9">
                  <animate attributeName="r" values="16;20;16" dur="1.5s" repeatCount="indefinite" />
               </circle>
               <circle cx="0" cy="0" r="8" fill="white" />
               <text x="0" y="70" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 600, fill: design.colors.textSecondary }}>
                  Light Source
               </text>
               <text x="0" y="85" textAnchor="middle" style={{ fontSize: '12px', fontWeight: 700, fill: lightColor }}>
                  {wavelength} nm
               </text>
            </g>

            {/* Photon beam */}
            <g opacity={intensity / 100}>
               {Array.from({ length: numPhotons }).map((_, i) => {
                  const progress = ((timeRef.current * 50 + i * 30) % 240) / 240;
                  const x = 140 + progress * 240;
                  const y = 130 + i * 10 + Math.sin(progress * Math.PI * 3) * 5;
                  return (
                     <g key={i}>
                        <circle cx={x} cy={y} r="6" fill="url(#photonGlow)" />
                        <circle cx={x} cy={y} r="3" fill={lightColor} />
                        {/* Wave visualization */}
                        <path
                           d={`M ${x-20},${y} Q ${x-10},${y-6} ${x},${y} Q ${x+10},${y+6} ${x+20},${y}`}
                           fill="none" stroke={lightColor} strokeWidth="1.5" opacity="0.5"
                        />
                     </g>
                  );
               })}
            </g>

            {/* Metal plate */}
            <g transform="translate(390, 90)">
               <rect x="0" y="0" width="30" height="140" rx="4" fill="url(#metalPlate)" stroke="#a8a29e" strokeWidth="1" />
               {/* Atomic structure hint */}
               {Array.from({ length: 10 }).map((_, i) => (
                  <circle key={i} cx="15" cy={10 + i * 13} r="4" fill="#57534e" opacity="0.5" />
               ))}
               <text x="15" y="160" textAnchor="middle" style={{ fontSize: '10px', fontWeight: 600, fill: design.colors.textSecondary }}>
                  {metals.find(m => m.workFunction === workFunction)?.name || 'Metal'}
               </text>
               <text x="15" y="175" textAnchor="middle" style={{ fontSize: '10px', fill: design.colors.primary }}>
                  Φ = {workFunction} eV
               </text>
            </g>

            {/* Ejected electrons */}
            {emissionOccurs && (
               <g filter="url(#glow)">
                  {Array.from({ length: numElectrons }).map((_, i) => {
                     const baseProgress = ((timeRef.current * 40 + i * 25) % 180) / 180;
                     const delay = 0.55;
                     if (baseProgress < delay) return null;
                     const progress = (baseProgress - delay) / (1 - delay);
                     const speed = Math.sqrt(maxKE) * 0.7 + 0.3;
                     const x = 430 + progress * speed * 100;
                     const y = 130 + i * 10 + Math.sin(progress * Math.PI * 2) * 8;
                     if (x > 530) return null;
                     return (
                        <g key={`e-${i}`}>
                           <circle cx={x} cy={y} r="7" fill="url(#electronGlow)" />
                           <circle cx={x} cy={y} r="3" fill={design.colors.electron} />
                           <text x={x} y={y + 2} textAnchor="middle" style={{ fontSize: '6px', fontWeight: 700, fill: '#0a0a12' }}>
                              e⁻
                           </text>
                        </g>
                     );
                  })}
               </g>
            )}

            {/* No emission indicator */}
            {!emissionOccurs && (
               <g transform="translate(480, 160)">
                  <rect x="-45" y="-25" width="90" height="50" rx="8"
                     fill={design.colors.dangerMuted} stroke={design.colors.danger} strokeWidth="1" />
                  <text x="0" y="-5" textAnchor="middle"
                     style={{ fontSize: '11px', fontWeight: 700, fill: design.colors.danger }}>
                     NO EMISSION
                  </text>
                  <text x="0" y="12" textAnchor="middle"
                     style={{ fontSize: '9px', fill: '#fca5a5' }}>
                     E_photon &lt; Φ
                  </text>
               </g>
            )}

            {/* Energy comparison panel */}
            <g transform="translate(80, 280)">
               <rect x="-15" y="-15" width="240" height="50" rx="8"
                  fill={design.colors.bgSecondary} stroke={design.colors.border} strokeWidth="1" />

               {/* Photon energy bar */}
               <rect x="0" y="0" width={Math.min(photonEnergy * 20, 100)} height="12" rx="2"
                  fill={design.colors.primary} />
               <text x="105" y="10" style={{ fontSize: '10px', fill: design.colors.primary, fontWeight: 600 }}>
                  E_photon = {photonEnergy.toFixed(2)} eV
               </text>

               {/* Work function marker */}
               <line x1={workFunction * 20} y1="-5" x2={workFunction * 20} y2="20"
                  stroke={design.colors.danger} strokeWidth="2" strokeDasharray="3,2" />
               <text x={workFunction * 20 + 3} y="26" style={{ fontSize: '8px', fill: design.colors.danger }}>
                  Φ = {workFunction} eV
               </text>
            </g>

            {/* KE indicator */}
            {emissionOccurs && (
               <g transform="translate(480, 280)">
                  <rect x="-50" y="-15" width="100" height="50" rx="8"
                     fill={design.colors.successMuted} stroke={design.colors.success} strokeWidth="1" />
                  <text x="0" y="2" textAnchor="middle"
                     style={{ fontSize: '10px', fontWeight: 700, fill: design.colors.success }}>
                     KE_max
                  </text>
                  <text x="0" y="18" textAnchor="middle"
                     style={{ fontSize: '14px', fontWeight: 800, fill: design.colors.success }}>
                     {maxKE.toFixed(2)} eV
                  </text>
               </g>
            )}
         </svg>
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
            background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #0c0c10 100%)`,
            fontFamily: design.font.sans,
         }}>
            <div style={{
               flex: 1,
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: isMobile ? '32px 20px' : '48px 32px',
               textAlign: 'center',
            }}>
               {/* Icon */}
               <div style={{
                  width: isMobile ? '80px' : '96px',
                  height: isMobile ? '80px' : '96px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.secondary} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '28px',
                  boxShadow: design.shadow.glow(design.colors.primary),
               }}>
                  <span style={{ fontSize: isMobile ? '36px' : '44px' }}>💡</span>
               </div>

               {/* Nobel badge */}
               <div style={{
                  padding: '12px 24px',
                  borderRadius: design.radius.full,
                  background: design.colors.primaryMuted,
                  border: `1px solid ${design.colors.primary}30`,
                  marginBottom: '20px',
               }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.primary }}>
                     🏆 Nobel Prize in Physics 1921
                  </span>
               </div>

               <h1 style={{
                  fontSize: isMobile ? '32px' : '40px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
               }}>
                  The Photoelectric Effect
               </h1>

               <p style={{
                  fontSize: isMobile ? '16px' : '18px',
                  color: design.colors.textSecondary,
                  marginBottom: '12px',
                  maxWidth: '440px',
                  lineHeight: 1.6,
               }}>
                  Einstein called it{' '}
                  <span style={{ color: design.colors.primary, fontWeight: 700 }}>"the most revolutionary discovery in physics"</span>
               </p>

               <p style={{
                  fontSize: '15px',
                  color: design.colors.textTertiary,
                  marginBottom: '36px',
                  maxWidth: '400px',
               }}>
                  Discover why light knocking electrons off metal proved that light is made of particles...
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
                     { icon: '🔬', label: 'Light Lab' },
                     { icon: '⚡', label: 'Photon Energy' },
                     { icon: '🏆', label: 'Nobel Discovery' },
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
                     onMouseDown={() => setGuidedMode(!guidedMode)}
                     style={{
                        width: '48px',
                        height: '26px',
                        borderRadius: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        background: guidedMode ? design.colors.success : design.colors.bgElevated,
                        position: 'relative',
                        transition: 'background 0.2s',
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

               {renderButton('Begin Experiment →', () => goToPhase('predict'))}

               <p style={{
                  fontSize: '13px',
                  color: design.colors.textMuted,
                  marginTop: '20px',
               }}>
                  ~5 minutes • Interactive quantum physics lab
               </p>
            </div>
         </div>
      );
   }

   // PREDICT PHASE
   if (phase === 'predict') {
      const options = [
         { id: 'brighter', label: 'Brighter light ejects faster electrons', desc: 'More light energy = more electron energy', icon: '☀️' },
         { id: 'color', label: 'Light color determines electron speed', desc: 'Frequency matters more than brightness', icon: '🌈' },
         { id: 'both', label: 'Both brightness and color matter', desc: 'Energy accumulates from both factors', icon: '⚖️' },
         { id: 'neither', label: 'Light cannot eject electrons', desc: 'Not enough energy in visible light', icon: '❌' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
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
                  What makes electrons fly out faster?
               </h2>
               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '28px',
                  lineHeight: 1.6,
                  maxWidth: '520px',
               }}>
                  When light hits a metal surface, electrons can be knocked free. What do you think determines how fast they fly out?
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onMouseDown={() => {
                           setPrediction(opt.id);
                           emit('prediction_made', { prediction: opt.id });
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
                           fontSize: '20px',
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
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: isMobile ? '300px' : 'auto',
               }}>
                  {renderPhotoelectricLab()}
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '280px',
                  padding: '20px',
                  background: design.colors.bgSecondary,
                  borderLeft: isMobile ? 'none' : `1px solid ${design.colors.border}`,
                  borderTop: isMobile ? `1px solid ${design.colors.border}` : 'none',
                  overflow: 'auto',
               }}>
                  {/* Wavelength slider */}
                  <div style={{ marginBottom: '24px' }}>
                     <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: design.colors.primary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                     }}>
                        Wavelength (λ)
                     </label>
                     <input
                        type="range"
                        min="200"
                        max="700"
                        value={wavelength}
                        onChange={(e) => {
                           const val = parseInt(e.target.value);
                           setWavelength(val);
                           setHasExperimented(true);
                           emit('wavelength_changed', { wavelength: val });
                        }}
                        style={{
                           width: '100%',
                           accentColor: design.colors.primary,
                        }}
                     />
                     <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: design.colors.textTertiary,
                        marginTop: '4px',
                     }}>
                        <span>UV (200nm)</span>
                        <span style={{ color: wavelengthToColor(wavelength), fontWeight: 700 }}>{wavelength} nm</span>
                        <span>Red (700nm)</span>
                     </div>
                  </div>

                  {/* Metal selector */}
                  <div style={{ marginBottom: '24px' }}>
                     <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                     }}>
                        Metal Type
                     </label>
                     <select
                        value={workFunction}
                        onChange={(e) => {
                           const val = parseFloat(e.target.value);
                           setWorkFunction(val);
                           emit('metal_changed', { workFunction: val });
                        }}
                        style={{
                           width: '100%',
                           padding: '12px',
                           borderRadius: design.radius.md,
                           border: `1px solid ${design.colors.border}`,
                           background: design.colors.bgTertiary,
                           color: design.colors.textPrimary,
                           fontSize: '14px',
                        }}
                     >
                        {metals.map(m => (
                           <option key={m.name} value={m.workFunction}>
                              {m.name} (Φ = {m.workFunction} eV)
                           </option>
                        ))}
                     </select>
                  </div>

                  {/* Results panel */}
                  <div style={{
                     padding: '16px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgTertiary,
                     border: `1px solid ${design.colors.border}`,
                  }}>
                     <p style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                     }}>
                        Results
                     </p>
                     <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                           <span style={{ fontSize: '12px', color: design.colors.textSecondary }}>Photon Energy:</span>
                           <span style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary }}>{photonEnergy.toFixed(2)} eV</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                           <span style={{ fontSize: '12px', color: design.colors.textSecondary }}>Work Function:</span>
                           <span style={{ fontSize: '12px', fontWeight: 700, color: design.colors.danger }}>{workFunction} eV</span>
                        </div>
                        <div style={{
                           marginTop: '8px',
                           paddingTop: '8px',
                           borderTop: `1px solid ${design.colors.border}`,
                           display: 'flex',
                           justifyContent: 'space-between',
                        }}>
                           <span style={{ fontSize: '12px', color: design.colors.textSecondary }}>Electron KE:</span>
                           <span style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: emissionOccurs ? design.colors.success : design.colors.danger,
                           }}>
                              {emissionOccurs ? `${maxKE.toFixed(2)} eV` : 'No emission'}
                           </span>
                        </div>
                     </div>
                  </div>

                  {guidedMode && (
                     <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        borderRadius: design.radius.md,
                        background: design.colors.primaryMuted,
                        border: `1px solid ${design.colors.primary}30`,
                     }}>
                        <p style={{ fontSize: '12px', color: design.colors.textSecondary }}>
                           💡 Try adjusting wavelength to find the threshold where electrons start/stop being emitted!
                        </p>
                     </div>
                  )}
               </div>
            </div>
            {renderBottomNav('predict', 'review', 'See What Happened →', !hasExperimented)}
         </div>
      );
   }

   // REVIEW PHASE
   if (phase === 'review') {
      const concepts = [
         {
            icon: '⚡',
            title: 'Photon Energy = hf',
            desc: 'Each photon carries energy proportional to its frequency. Higher frequency (bluer light) = more energy per photon.',
            color: design.colors.primary,
         },
         {
            icon: '🚧',
            title: 'Work Function Barrier',
            desc: 'Electrons are bound to the metal with minimum energy Φ. Photons must have energy ≥ Φ to free electrons.',
            color: design.colors.danger,
         },
         {
            icon: '🏃',
            title: 'Kinetic Energy = E - Φ',
            desc: 'Extra energy beyond the work function becomes kinetic energy of the ejected electron.',
            color: design.colors.success,
         },
         {
            icon: '📊',
            title: 'Threshold Frequency',
            desc: 'Below a certain frequency, NO electrons escape—regardless of how bright the light is!',
            color: design.colors.secondary,
         },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
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
                  marginBottom: '24px',
                  letterSpacing: '-0.02em',
               }}>
                  Einstein's Key Insight
               </h2>

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
                           fontSize: '24px',
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

               {/* Einstein's equation */}
               <div style={{
                  marginTop: '24px',
                  padding: '24px',
                  borderRadius: design.radius.lg,
                  background: `linear-gradient(135deg, ${design.colors.primaryMuted} 0%, ${design.colors.secondaryMuted} 100%)`,
                  border: `1px solid ${design.colors.primary}40`,
                  maxWidth: '560px',
                  textAlign: 'center',
               }}>
                  <p style={{
                     fontSize: '12px',
                     fontWeight: 700,
                     color: design.colors.primary,
                     marginBottom: '12px',
                     textTransform: 'uppercase',
                  }}>
                     Einstein's Photoelectric Equation
                  </p>
                  <p style={{
                     fontSize: '28px',
                     fontWeight: 800,
                     color: design.colors.textPrimary,
                     fontFamily: 'serif',
                  }}>
                     KE<sub>max</sub> = hf - Φ
                  </p>
                  <p style={{
                     fontSize: '12px',
                     color: design.colors.textSecondary,
                     marginTop: '12px',
                  }}>
                     h = Planck's constant • f = frequency • Φ = work function
                  </p>
               </div>
            </div>
            {renderBottomNav('play', 'twist_predict', 'The Paradox →')}
         </div>
      );
   }

   // TWIST_PREDICT PHASE
   if (phase === 'twist_predict') {
      const options = [
         { id: 'brighter_faster', label: 'Brighter light = faster electrons', desc: 'More photons = more total energy delivered', icon: '⬆️' },
         { id: 'same_speed', label: 'Brightness doesn\'t change speed', desc: 'Each photon has fixed energy E = hf', icon: '➡️' },
         { id: 'slower', label: 'Brighter light = slower electrons', desc: 'Energy gets divided among more electrons', icon: '⬇️' },
      ];

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 5 • The Paradox
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
               }}>
                  Classical Physics Got It Wrong!
               </h2>
               <p style={{
                  fontSize: '15px',
                  color: design.colors.textSecondary,
                  marginBottom: '8px',
                  lineHeight: 1.6,
                  maxWidth: '520px',
               }}>
                  Before Einstein, physicists expected brighter light (more total energy) would make electrons fly faster.
               </p>
               <p style={{
                  fontSize: '14px',
                  color: design.colors.textTertiary,
                  marginBottom: '28px',
                  maxWidth: '520px',
               }}>
                  What do YOU predict happens if we increase brightness while keeping wavelength constant?
               </p>

               <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
                  {options.map(opt => (
                     <button
                        key={opt.id}
                        onMouseDown={() => {
                           setTwistPrediction(opt.id);
                           emit('twist_prediction_made', { prediction: opt.id });
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
            {renderBottomNav('review', 'twist_play', 'Test It! →', !twistPrediction)}
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
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
               {/* Visualization */}
               <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: isMobile ? '280px' : 'auto',
               }}>
                  {renderPhotoelectricLab()}
               </div>

               {/* Controls */}
               <div style={{
                  width: isMobile ? '100%' : '300px',
                  padding: '20px',
                  background: design.colors.bgSecondary,
                  borderLeft: isMobile ? 'none' : `1px solid ${design.colors.border}`,
                  overflow: 'auto',
               }}>
                  <p style={{
                     fontSize: '14px',
                     fontWeight: 700,
                     color: design.colors.secondary,
                     marginBottom: '20px',
                  }}>
                     Intensity vs Frequency Test
                  </p>

                  {/* Intensity slider */}
                  <div style={{ marginBottom: '24px' }}>
                     <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                     }}>
                        Intensity (# of photons)
                     </label>
                     <input
                        type="range"
                        min="20"
                        max="100"
                        value={intensity}
                        onChange={(e) => {
                           const val = parseInt(e.target.value);
                           setIntensity(val);
                           setHasTestedIntensity(true);
                           emit('intensity_changed', { intensity: val });
                        }}
                        style={{ width: '100%' }}
                     />
                     <p style={{ fontSize: '11px', color: design.colors.textTertiary, marginTop: '4px' }}>
                        {intensity}% → {emissionOccurs ? Math.floor(intensity / 12) : 0} electrons/cycle
                     </p>
                  </div>

                  {/* Wavelength slider */}
                  <div style={{ marginBottom: '24px' }}>
                     <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: design.colors.primary,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                     }}>
                        Wavelength (photon energy)
                     </label>
                     <input
                        type="range"
                        min="200"
                        max="700"
                        value={wavelength}
                        onChange={(e) => {
                           const val = parseInt(e.target.value);
                           setWavelength(val);
                           setHasTestedIntensity(true);
                        }}
                        style={{ width: '100%', accentColor: design.colors.primary }}
                     />
                     <p style={{ fontSize: '11px', color: design.colors.textTertiary, marginTop: '4px' }}>
                        {wavelength}nm → {photonEnergy.toFixed(2)} eV/photon
                     </p>
                  </div>

                  {/* Results comparison */}
                  <div style={{
                     padding: '16px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgTertiary,
                     border: `1px solid ${design.colors.border}`,
                  }}>
                     <p style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: design.colors.textPrimary,
                        marginBottom: '12px',
                     }}>
                        Key Observation:
                     </p>
                     <p style={{ fontSize: '12px', color: design.colors.textSecondary, marginBottom: '8px' }}>
                        • Electron count: <span style={{ color: design.colors.secondary, fontWeight: 700 }}>{emissionOccurs ? Math.floor(intensity / 12) : 0}</span> (from intensity)
                     </p>
                     <p style={{ fontSize: '12px', color: design.colors.textSecondary }}>
                        • Electron speed: <span style={{ color: design.colors.primary, fontWeight: 700 }}>{maxKE.toFixed(2)} eV</span> (from wavelength)
                     </p>
                     <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        borderRadius: design.radius.md,
                        background: design.colors.successMuted,
                        border: `1px solid ${design.colors.success}30`,
                     }}>
                        <p style={{ fontSize: '11px', color: design.colors.success, fontWeight: 600 }}>
                           ✓ Speed only depends on wavelength—not intensity!
                        </p>
                     </div>
                  </div>
               </div>
            </div>
            {renderBottomNav('twist_predict', 'twist_review', 'Understand Why →', !hasTestedIntensity)}
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
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 20px' : '32px 24px' }}>
               <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: design.colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
               }}>
                  Step 7 • The Quantum Truth
               </p>
               <h2 style={{
                  fontSize: isMobile ? '24px' : '28px',
                  fontWeight: 800,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  letterSpacing: '-0.02em',
               }}>
                  Light Comes in Packets!
               </h2>

               <div style={{ display: 'grid', gap: '16px', maxWidth: '560px' }}>
                  {/* Classical wrong */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: design.colors.dangerMuted,
                     border: `1px solid ${design.colors.danger}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.danger,
                        marginBottom: '12px',
                     }}>
                        ❌ Classical Prediction (WRONG)
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        "Brighter light delivers more total energy, so electrons should fly faster."
                        <br /><br />
                        This assumes light energy accumulates continuously like a water wave.
                     </p>
                  </div>

                  {/* Quantum correct */}
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
                        ✓ Quantum Reality (CORRECT)
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        Light comes in <strong style={{ color: design.colors.textPrimary }}>discrete packets (photons)</strong>, each with energy E = hf.
                        <br /><br />
                        More photons = more electrons, but each electron's energy depends only on the photon's frequency!
                     </p>
                  </div>

                  {/* Nobel Prize */}
                  <div style={{
                     padding: '24px',
                     borderRadius: design.radius.lg,
                     background: `linear-gradient(135deg, ${design.colors.primaryMuted} 0%, ${design.colors.secondaryMuted} 100%)`,
                     border: `1px solid ${design.colors.primary}40`,
                  }}>
                     <p style={{
                        fontWeight: 700,
                        fontSize: '16px',
                        color: design.colors.primary,
                        marginBottom: '12px',
                     }}>
                        🏆 Einstein's Nobel Prize (1921)
                     </p>
                     <p style={{
                        fontSize: '14px',
                        color: design.colors.textSecondary,
                        lineHeight: 1.7,
                     }}>
                        This explanation proved that light has <strong style={{ color: design.colors.textPrimary }}>particle-like properties</strong>. Light isn't just a wave—it's also made of discrete quanta called photons.
                        <br /><br />
                        This launched the quantum revolution!
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
      const app = applications[activeApp];
      const allAppsCompleted = completedApps.size >= applications.length;

      return (
         <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
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
                  {applications.map((a, i) => (
                     <button
                        key={i}
                        onMouseDown={() => setActiveApp(i)}
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

               {/* Content area */}
               <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                  {/* App header */}
                  <div style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '16px',
                     marginBottom: '24px',
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
                           color: design.colors.textPrimary,
                           marginBottom: '4px',
                        }}>
                           {app.title}
                        </h3>
                        <p style={{
                           fontSize: '14px',
                           color: app.color,
                           fontWeight: 600,
                        }}>
                           {app.stat}
                        </p>
                     </div>
                  </div>

                  {/* Description */}
                  <p style={{
                     fontSize: '15px',
                     color: design.colors.textSecondary,
                     lineHeight: 1.7,
                     marginBottom: '24px',
                  }}>
                     {app.description}
                  </p>

                  {/* Details list */}
                  <div style={{
                     padding: '20px',
                     borderRadius: design.radius.lg,
                     background: design.colors.bgSecondary,
                     border: `1px solid ${design.colors.border}`,
                  }}>
                     <p style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: design.colors.textTertiary,
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                     }}>
                        How It Works
                     </p>
                     <div style={{ display: 'grid', gap: '10px' }}>
                        {app.details.map((detail, i) => (
                           <div key={i} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                           }}>
                              <div style={{
                                 width: '24px',
                                 height: '24px',
                                 borderRadius: '50%',
                                 background: `${app.color}20`,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '12px',
                                 fontWeight: 700,
                                 color: app.color,
                                 flexShrink: 0,
                              }}>
                                 {i + 1}
                              </div>
                              <p style={{
                                 fontSize: '14px',
                                 color: design.colors.textSecondary,
                                 lineHeight: 1.5,
                              }}>
                                 {detail}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Mark as read button - GOLD STANDARD sequential navigation */}
                  {!completedApps.has(activeApp) && (
                     <button
                        onMouseDown={() => {
                           const newCompleted = new Set(completedApps);
                           newCompleted.add(activeApp);
                           setCompletedApps(newCompleted);
                           // Auto-advance to next unread app
                           if (activeApp < applications.length - 1) {
                              setActiveApp(activeApp + 1);
                           }
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
                        }}
                     >
                        ✓ Mark "{app.title}" as Read
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
                        color: completedApps.size >= applications.length ? design.colors.success : design.colors.textSecondary,
                        fontWeight: 600,
                     }}>
                        {completedApps.size >= applications.length
                           ? '✓ All applications reviewed! Ready for quiz.'
                           : `Progress: ${completedApps.size} of ${applications.length} applications reviewed`}
                     </p>
                  </div>
               </div>
            </div>
            {renderBottomNav('twist_review', 'test', 'Take the Quiz →', !allAppsCompleted)}
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
            background: design.colors.bgPrimary,
            fontFamily: design.font.sans,
         }}>
            {renderProgressBar()}
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '20px' : '24px' }}>
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

               {/* Question */}
               <h3 style={{
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: 700,
                  color: design.colors.textPrimary,
                  marginBottom: '24px',
                  lineHeight: 1.4,
               }}>
                  {q.q}
               </h3>

               {/* Answer options */}
               <div style={{ display: 'grid', gap: '12px' }}>
                  {q.opts.map((opt, i) => {
                     const isCorrect = i === q.correct;
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
                           onMouseDown={() => {
                              if (selectedAnswer !== null) return;
                              setSelectedAnswer(i);
                              setShowExplanation(true);
                              if (isCorrect) setTestScore(s => s + 1);
                              emit('answer_submitted', { questionIndex: testIndex, answer: opt, isCorrect });
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
                           <p style={{ fontSize: '14px', color: textColor, lineHeight: 1.4 }}>{opt}</p>
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
                        {q.explain}
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
                           emit('test_completed', { score: testScore, maxScore: testQuestions.length });
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
                     background: [design.colors.primary, design.colors.secondary, design.colors.success, design.colors.warning, design.colors.electron, design.colors.photon][i % 6],
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
                     ? `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.secondary} 100%)`
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
                  {isPassing ? 'Quantum Master!' : 'Keep Learning!'}
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
                     { icon: '💡', label: 'Light = Photons' },
                     { icon: '⚡', label: 'E = hf' },
                     { icon: '🚧', label: 'Work Function Φ' },
                     { icon: '🏆', label: 'Nobel Prize 1921' },
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
                     () => emit('game_completed', { score: testScore, maxScore: testQuestions.length, percentage })
                  )}
               </div>
            </div>
         </div>
      );
   }

   return null;
};

export default PhotoelectricEffectRenderer;
