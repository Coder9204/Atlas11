'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// DIFFUSION VS CONVECTION RENDERER - Premium Apple/Airbnb Design
// ============================================================================

export interface GameEvent {
   eventType: 'phase_changed' | 'prediction_made' | 'experiment_action' | 'parameter_changed' |
              'answer_submitted' | 'hint_requested' | 'milestone_reached' | 'game_completed' |
              'game_started' | 'visual_state_update' | 'test_completed' | 'lesson_completed' |
              'twist_prediction_made' | 'dye_added' | 'temperature_changed';
   gameType: string;
   gameTitle: string;
   details: Record<string, unknown>;
   timestamp: number;
}

interface DiffusionConvectionRendererProps {
   onGameEvent?: (event: GameEvent) => void;
   gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const design = {
   colors: {
      bgPrimary: '#0c0a09', bgSecondary: '#1c1917', bgTertiary: '#292524', bgElevated: '#44403c',
      textPrimary: '#fafaf9', textSecondary: '#a8a29e', textTertiary: '#78716c', textMuted: '#57534e',
      primary: '#a855f7', primaryHover: '#9333ea', primaryMuted: '#3b0764',
      secondary: '#ec4899', secondaryMuted: '#500724',
      success: '#22c55e', successMuted: '#052e16', warning: '#f97316', danger: '#ef4444',
      cold: '#3b82f6', hot: '#ef4444', dye: '#d946ef', border: '#44403c',
   },
   radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
   shadow: { sm: '0 1px 2px rgba(0,0,0,0.3)', md: '0 4px 12px rgba(0,0,0,0.4)', glow: (c: string) => `0 0 40px ${c}40` },
   font: { sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
};

const DiffusionConvectionRenderer: React.FC<DiffusionConvectionRendererProps> = ({ onGameEvent, gamePhase }) => {
   const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
   const [phase, setPhase] = useState<Phase>(() => (gamePhase && validPhases.includes(gamePhase as Phase)) ? gamePhase as Phase : 'hook');
   const [prediction, setPrediction] = useState<string | null>(null);
   const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
   const [dyeAdded, setDyeAdded] = useState(false);
   const [time, setTime] = useState(0);
   const [hasExperimented, setHasExperimented] = useState(false);
   const [substance, setSubstance] = useState<'dye' | 'salt'>('dye');
   const [hasTriedSalt, setHasTriedSalt] = useState(false);
   const [guidedMode, setGuidedMode] = useState(true);
   const [testIndex, setTestIndex] = useState(0);
   const [testScore, setTestScore] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
   const [showExplanation, setShowExplanation] = useState(false);
   const [transferIndex, setTransferIndex] = useState(0);
   const animationRef = useRef<number>();
   const isNavigating = useRef(false);

   useEffect(() => { if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) setPhase(gamePhase as Phase); }, [gamePhase]);
   useEffect(() => {
      const animate = () => { if (dyeAdded) setTime(t => t + 0.02); animationRef.current = requestAnimationFrame(animate); };
      animationRef.current = requestAnimationFrame(animate);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
   }, [dyeAdded]);

   const emit = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
      onGameEvent?.({ eventType, gameType: 'diffusion_convection', gameTitle: 'Diffusion vs Convection', details: { phase, guidedMode, ...details }, timestamp: Date.now() });
   }, [onGameEvent, phase, guidedMode]);

   const goToPhase = useCallback((newPhase: Phase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      setPhase(newPhase);
      emit('phase_changed', { newPhase });
      setTimeout(() => { isNavigating.current = false; }, 300);
   }, [emit]);

   const addDye = useCallback(() => { setDyeAdded(true); setTime(0); setHasExperimented(true); if (substance === 'salt') setHasTriedSalt(true); emit('dye_added', { substance }); }, [substance, emit]);
   const resetExperiment = useCallback(() => { setDyeAdded(false); setTime(0); }, []);

   const testQuestions = [
      { q: 'Why does dye spread faster in warm water?', opts: ['Dye is lighter when warm', 'Convection currents carry it', 'Warm water is thicker', 'Gravity is weaker'], correct: 1, explain: 'Warm water creates convection currents that actively carry the dye.' },
      { q: 'What is diffusion?', opts: ['Heating a liquid', 'Random molecular movement spreading particles', 'Water evaporating', 'Mixing with a spoon'], correct: 1, explain: 'Diffusion is the natural spreading of particles through random molecular motion.' },
      { q: 'Why does cold water show mainly diffusion?', opts: ['No molecular motion', 'Minimal temperature gradients', 'Water freezes', 'Dye sinks faster'], correct: 1, explain: 'Cold water has minimal convection because there\'s no significant temperature difference.' },
      { q: 'Which process is faster?', opts: ['Diffusion', 'Convection', 'Both are equal', 'Depends on container'], correct: 1, explain: 'Convection is much faster because bulk fluid movement transports particles.' },
      { q: 'What creates convection currents?', opts: ['Magnetic fields', 'Temperature differences causing density changes', 'Electric current', 'Sound waves'], correct: 1, explain: 'Warm fluid is less dense and rises; cool fluid sinks, creating circulation.' },
      { q: 'In a lava lamp, what causes blobs to move?', opts: ['Magnets', 'Convection from heating', 'Wind', 'Chemical reactions'], correct: 1, explain: 'The light bulb heats the wax, making it rise, cool, and sink—convection!' },
      { q: 'Ocean currents are an example of...', opts: ['Diffusion', 'Convection', 'Evaporation', 'Condensation'], correct: 1, explain: 'Ocean currents are driven by temperature and salinity differences—a form of convection.' },
      { q: 'Why do radiators work best when placed low?', opts: ['Closer to floor', 'Warm air rises, creating convection', 'Easier to install', 'More space'], correct: 1, explain: 'Low radiators heat air which rises, creating convection currents throughout the room.' },
      { q: 'Diffusion happens even without...', opts: ['Molecules', 'Particles', 'Temperature differences', 'A container'], correct: 2, explain: 'Diffusion is driven by random molecular motion—no temperature difference needed.' },
      { q: 'What happens to convection in zero-g?', opts: ['Speeds up', 'Works normally', 'Stops - no buoyancy', 'Reverses'], correct: 2, explain: 'Without gravity, there\'s no buoyancy force, so convection doesn\'t work!' }
   ];

   const apps = [
      { icon: '🌊', title: 'Ocean Circulation', desc: 'Warm tropical water rises and moves toward poles while cold polar water sinks—the thermohaline circulation that regulates Earth\'s climate.', stat: '100+ years per cycle', color: design.colors.primary },
      { icon: '🏠', title: 'Home Heating', desc: 'Radiators use convection to distribute warm air. Hot air rises, cool air sinks, creating natural circulation.', stat: '30% energy savings', color: design.colors.warning },
      { icon: '☁️', title: 'Weather Systems', desc: 'Convection drives thunderstorms, hurricanes, and global wind patterns. Warm air rises and releases moisture.', stat: '40,000+ storms/day', color: design.colors.cold },
      { icon: '🫁', title: 'Oxygen in Blood', desc: 'Oxygen diffuses from lungs into blood, then from blood into cells. Pure diffusion at work!', stat: '6L of air/minute', color: design.colors.danger }
   ];

   const Button = ({ children, onClick, variant = 'primary', disabled = false, fullWidth = false }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; fullWidth?: boolean }) => (
      <button onClick={() => !disabled && onClick()} style={{ padding: '14px 28px', borderRadius: design.radius.md, fontWeight: 600, fontSize: '15px', fontFamily: design.font.sans, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'all 0.2s', width: fullWidth ? '100%' : 'auto', ...(variant === 'primary' ? { background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`, color: 'white', boxShadow: design.shadow.md } : { background: 'transparent', color: design.colors.textSecondary }) }}>{children}</button>
   );

   const ProgressBar = () => {
      const idx = validPhases.indexOf(phase);
      return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '16px', borderBottom: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary }}>
         {validPhases.map((_, i) => (<div key={i} style={{ width: i === idx ? '24px' : '8px', height: '8px', borderRadius: design.radius.full, background: i < idx ? design.colors.success : i === idx ? design.colors.primary : design.colors.bgElevated, transition: 'all 0.3s' }} />))}
         <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 600, color: design.colors.textTertiary }}>{idx + 1}/10</span>
      </div>);
   };

   const CupsVis = () => {
      const spread = Math.min(time * 0.5, 1);
      return (
         <svg viewBox="0 0 600 280" style={{ width: '100%', maxHeight: '280px' }}>
            <defs>
               <linearGradient id="coldW" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1d4ed8" /><stop offset="100%" stopColor="#1e3a8a" /></linearGradient>
               <linearGradient id="hotW" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#b91c1c" /><stop offset="100%" stopColor="#dc2626" /></linearGradient>
               <filter id="gl"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <rect width="600" height="280" fill={design.colors.bgPrimary} />
            <text x="150" y="30" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 700, fill: design.colors.cold }}>COLD WATER</text>
            <text x="450" y="30" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 700, fill: design.colors.hot }}>HOT WATER</text>
            <g transform="translate(50, 50)">
               <path d="M20 0 L180 0 L170 180 L30 180 Z" fill="url(#coldW)" stroke={design.colors.border} strokeWidth="2" />
               {dyeAdded && <ellipse cx="100" cy="90" rx={20 + spread * 18} ry={15 + spread * 14} fill={design.colors.dye} filter="url(#gl)" opacity={0.8 - spread * 0.3} />}
               <text x="100" y="210" textAnchor="middle" style={{ fontSize: '12px', fill: design.colors.textSecondary }}>Slow (diffusion only)</text>
            </g>
            <g transform="translate(350, 50)">
               <path d="M20 0 L180 0 L170 180 L30 180 Z" fill="url(#hotW)" stroke={design.colors.border} strokeWidth="2" />
               {dyeAdded && <g opacity={0.6}><path d="M60 140 L60 60" stroke={design.colors.hot} strokeWidth="3" /><path d="M140 60 L140 140" stroke={design.colors.cold} strokeWidth="3" /></g>}
               {dyeAdded && <ellipse cx={100 + Math.sin(time * 2) * 20} cy={90 - spread * 50 + Math.sin(time * 3) * 30} rx={25 + spread * 70} ry={20 + spread * 50} fill={design.colors.dye} filter="url(#gl)" opacity={0.7 - spread * 0.4} />}
               <text x="100" y="210" textAnchor="middle" style={{ fontSize: '12px', fill: design.colors.textSecondary }}>Fast (convection!)</text>
            </g>
            {dyeAdded && <g><rect x="250" y="250" width="100" height="24" rx="12" fill={design.colors.bgSecondary} /><text x="300" y="266" textAnchor="middle" style={{ fontSize: '12px', fontWeight: 600, fill: design.colors.textPrimary }}>{(time * 2).toFixed(1)}s</text></g>}
         </svg>
      );
   };

   if (phase === 'hook') return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #0a0908 100%)`, fontFamily: design.font.sans }}>
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: design.shadow.glow(design.colors.primary) }}><span style={{ fontSize: '40px' }}>🧪</span></div>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '16px' }}>Diffusion vs Convection</h1>
            <p style={{ fontSize: '18px', color: design.colors.textSecondary, marginBottom: '40px', maxWidth: '400px', lineHeight: 1.6 }}>Why does dye spread <span style={{ color: design.colors.hot, fontWeight: 600 }}>faster in hot water</span> than in cold?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '420px', width: '100%', marginBottom: '40px' }}>
               {[{ icon: '🌡️', label: 'Temperature Effects' }, { icon: '🔄', label: 'Convection Currents' }, { icon: '📈', label: 'Speed Comparison' }].map((item, i) => (
                  <div key={i} style={{ padding: '20px 12px', borderRadius: design.radius.lg, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
                     <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                     <div style={{ fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary }}>{item.label}</div>
                  </div>
               ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '12px 20px', borderRadius: design.radius.full, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}>
               <span style={{ fontSize: '14px', color: design.colors.textSecondary }}>AI Coach</span>
               <button onClick={() => setGuidedMode(!guidedMode)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: guidedMode ? design.colors.success : design.colors.bgElevated, position: 'relative' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: guidedMode ? '23px' : '3px', transition: 'left 0.2s' }} />
               </button>
               <span style={{ fontSize: '13px', fontWeight: 600, color: guidedMode ? design.colors.success : design.colors.textMuted }}>{guidedMode ? 'ON' : 'OFF'}</span>
            </div>
            <Button onClick={() => goToPhase('predict')}>Start Experiment →</Button>
            <p style={{ fontSize: '13px', color: design.colors.textMuted, marginTop: '20px' }}>~5 minutes • Interactive experience</p>
         </div>
      </div>
   );

   if (phase === 'predict') {
      const opts = [{ id: 'cold', label: 'Cold water', desc: 'Less energy means less spreading' }, { id: 'hot', label: 'Hot water', desc: 'More energy means faster spreading' }, { id: 'same', label: 'Same speed', desc: 'Temperature doesn\'t matter' }];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 2 • Prediction</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '12px' }}>In which water will dye spread faster?</h2>
               <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                  {opts.map(opt => (
                     <button key={opt.id} onClick={() => { setPrediction(opt.id); emit('prediction_made', { prediction: opt.id }); }} style={{ padding: '20px', borderRadius: design.radius.lg, border: `2px solid ${prediction === opt.id ? design.colors.primary : design.colors.border}`, background: prediction === opt.id ? design.colors.primaryMuted : design.colors.bgSecondary, textAlign: 'left', cursor: 'pointer' }}>
                        <p style={{ fontWeight: 600, fontSize: '15px', color: prediction === opt.id ? design.colors.primary : design.colors.textPrimary, marginBottom: '4px' }}>{opt.label}</p>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                     </button>
                  ))}
               </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('hook')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('play')} disabled={!prediction}>Test It →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'play') return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
         <ProgressBar />
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CupsVis /></div>
            <div style={{ padding: '20px 24px', background: design.colors.bgSecondary, borderTop: `1px solid ${design.colors.border}` }}>
               <Button onClick={dyeAdded ? resetExperiment : addDye} fullWidth>{dyeAdded ? '🔄 Reset' : '💧 Add Dye to Both Cups'}</Button>
               {dyeAdded && time > 1 && <div style={{ marginTop: '12px', padding: '12px', borderRadius: design.radius.md, background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40` }}><p style={{ fontSize: '13px', color: design.colors.primary, fontWeight: 600 }}>Notice: Hot water spreads much faster due to convection!</p></div>}
            </div>
         </div>
         <div style={{ padding: '16px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => goToPhase('predict')} variant="ghost">← Back</Button>
            <Button onClick={() => goToPhase('review')} disabled={!hasExperimented}>Continue →</Button>
         </div>
      </div>
   );

   if (phase === 'review') {
      const pts = [{ icon: '🔵', title: 'Cold: Diffusion Only', desc: 'Molecules move randomly but slowly.' }, { icon: '🔴', title: 'Hot: Diffusion + Convection', desc: 'Warm water rises, cool sinks—currents carry dye!' }, { icon: '⚡', title: 'Speed Difference', desc: 'Convection is MUCH faster than diffusion.' }, { icon: '🌡️', title: 'Heat = Currents', desc: 'Temperature differences drive convection.' }];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.success, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 4 • Review</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '24px' }}>Two Ways to Spread</h2>
               <div style={{ display: 'grid', gap: '16px', maxWidth: '550px' }}>
                  {pts.map((p, i) => (<div key={i} style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: design.radius.lg, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}><div style={{ fontSize: '28px' }}>{p.icon}</div><div><p style={{ fontWeight: 700, fontSize: '15px', color: design.colors.textPrimary, marginBottom: '4px' }}>{p.title}</p><p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{p.desc}</p></div></div>))}
               </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('play')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('twist_predict')}>The Salt Puzzle →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'twist_predict') {
      const opts = [{ id: 'faster', label: 'Salt dissolves faster', desc: 'Salt is more soluble' }, { id: 'same', label: 'Same speed', desc: 'Both follow same rules' }, { id: 'slower', label: 'Salt is slower initially', desc: 'Salt sinks first' }];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 5 • Salt Puzzle</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '12px' }}>What about salt instead of dye?</h2>
               <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                  {opts.map(opt => (
                     <button key={opt.id} onClick={() => { setTwistPrediction(opt.id); emit('twist_prediction_made', { prediction: opt.id }); }} style={{ padding: '20px', borderRadius: design.radius.lg, border: `2px solid ${twistPrediction === opt.id ? design.colors.secondary : design.colors.border}`, background: twistPrediction === opt.id ? design.colors.secondaryMuted : design.colors.bgSecondary, textAlign: 'left', cursor: 'pointer' }}>
                        <p style={{ fontWeight: 600, fontSize: '15px', color: twistPrediction === opt.id ? design.colors.secondary : design.colors.textPrimary, marginBottom: '4px' }}>{opt.label}</p>
                        <p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{opt.desc}</p>
                     </button>
                  ))}
               </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('review')} variant="ghost">← Back</Button>
               <Button onClick={() => { setSubstance('salt'); goToPhase('twist_play'); }} disabled={!twistPrediction}>Test It →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'twist_play') return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
         <ProgressBar />
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CupsVis /></div>
            <div style={{ padding: '20px 24px', background: design.colors.bgSecondary, borderTop: `1px solid ${design.colors.border}` }}>
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  {['dye', 'salt'].map(s => (<button key={s} onClick={() => { setSubstance(s as 'dye' | 'salt'); resetExperiment(); }} style={{ flex: 1, padding: '14px', borderRadius: design.radius.md, border: `2px solid ${substance === s ? design.colors.dye : design.colors.border}`, background: substance === s ? `${design.colors.dye}20` : design.colors.bgTertiary, color: substance === s ? design.colors.dye : design.colors.textSecondary, fontWeight: 600, cursor: 'pointer' }}>{s === 'dye' ? '💧 Dye' : '🧂 Salt'}</button>))}
               </div>
               <Button onClick={dyeAdded ? resetExperiment : addDye} fullWidth>{dyeAdded ? '🔄 Reset' : `Add ${substance}`}</Button>
            </div>
         </div>
         <div style={{ padding: '16px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => goToPhase('twist_predict')} variant="ghost">← Back</Button>
            <Button onClick={() => goToPhase('twist_review')} disabled={!hasTriedSalt}>Understand Why →</Button>
         </div>
      </div>
   );

   if (phase === 'twist_review') {
      const insights = [{ icon: '🧂', title: 'Salt Sinks First', desc: 'Salt is denser than water, so it sinks before dissolving.', color: design.colors.secondary }, { icon: '💧', title: 'Dye Stays Suspended', desc: 'Dye is similar density to water, so it spreads immediately.', color: design.colors.primary }, { icon: '🌊', title: 'Both Use Convection', desc: 'In hot water, convection speeds up both—but salt\'s sinking delays mixing.', color: design.colors.success }];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
               <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 7 • Key Insight</p>
               <h2 style={{ fontSize: '28px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '24px' }}>Density Matters Too!</h2>
               <div style={{ display: 'grid', gap: '16px', maxWidth: '550px' }}>
                  {insights.map((p, i) => (<div key={i} style={{ padding: '24px', borderRadius: design.radius.lg, background: `${p.color}15`, border: `1px solid ${p.color}40` }}><p style={{ fontWeight: 700, fontSize: '15px', color: p.color, marginBottom: '8px' }}>{p.icon} {p.title}</p><p style={{ fontSize: '14px', color: design.colors.textSecondary, lineHeight: 1.6 }}>{p.desc}</p></div>))}
               </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_play')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('transfer')}>Real-World Uses →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'transfer') {
      const app = apps[transferIndex];
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               <div style={{ display: 'flex', gap: '8px', padding: '16px', borderBottom: `1px solid ${design.colors.border}`, overflowX: 'auto' }}>
                  {apps.map((a, i) => (<button key={i} onClick={() => setTransferIndex(i)} style={{ padding: '10px 16px', borderRadius: design.radius.md, border: 'none', background: i === transferIndex ? a.color : design.colors.bgTertiary, color: i === transferIndex ? 'white' : design.colors.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{a.icon} {a.title}</button>))}
               </div>
               <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                     <div style={{ width: '56px', height: '56px', borderRadius: design.radius.lg, background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{app.icon}</div>
                     <div><h3 style={{ fontSize: '22px', fontWeight: 800, color: design.colors.textPrimary }}>{app.title}</h3><p style={{ fontSize: '14px', color: app.color, fontWeight: 600 }}>{app.stat}</p></div>
                  </div>
                  <p style={{ fontSize: '15px', color: design.colors.textSecondary, lineHeight: 1.7 }}>{app.desc}</p>
               </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary, display: 'flex', justifyContent: 'space-between' }}>
               <Button onClick={() => goToPhase('twist_review')} variant="ghost">← Back</Button>
               <Button onClick={() => goToPhase('test')}>Take the Test →</Button>
            </div>
         </div>
      );
   }

   if (phase === 'test') {
      const q = testQuestions[testIndex], isLast = testIndex === testQuestions.length - 1;
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary, fontFamily: design.font.sans }}>
            <ProgressBar />
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.primary }}>Question {testIndex + 1}/10</p><p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.success }}>Score: {testScore}/10</p></div>
               <h3 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '20px' }}>{q.q}</h3>
               <div style={{ display: 'grid', gap: '10px' }}>
                  {q.opts.map((opt, i) => {
                     const isC = i === q.correct, isS = i === selectedAnswer;
                     let bg = design.colors.bgSecondary, bd = design.colors.border, tc = design.colors.textPrimary;
                     if (selectedAnswer !== null) { if (isC) { bg = design.colors.successMuted; bd = design.colors.success; tc = design.colors.success; } else if (isS) { bg = `${design.colors.danger}20`; bd = design.colors.danger; tc = design.colors.danger; } }
                     return (<button key={i} onClick={() => { if (selectedAnswer !== null) return; setSelectedAnswer(i); setShowExplanation(true); if (isC) setTestScore(s => s + 1); emit('answer_submitted', { questionIndex: testIndex, isCorrect: isC }); }} style={{ padding: '16px', borderRadius: design.radius.md, border: `2px solid ${bd}`, background: bg, textAlign: 'left', cursor: selectedAnswer === null ? 'pointer' : 'default' }}><p style={{ fontSize: '14px', color: tc }}>{opt}</p></button>);
                  })}
               </div>
               {showExplanation && <div style={{ marginTop: '20px', padding: '16px', borderRadius: design.radius.md, background: design.colors.primaryMuted, border: `1px solid ${design.colors.primary}40` }}><p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.primary, marginBottom: '6px' }}>Explanation</p><p style={{ fontSize: '13px', color: design.colors.textSecondary }}>{q.explain}</p></div>}
            </div>
            {showExplanation && <div style={{ padding: '20px 24px', borderTop: `1px solid ${design.colors.border}`, background: design.colors.bgSecondary }}><Button onClick={() => { if (isLast) { emit('test_completed', { score: testScore }); goToPhase('mastery'); } else { setTestIndex(i => i + 1); setSelectedAnswer(null); setShowExplanation(false); } }} fullWidth>{isLast ? 'See Results →' : 'Next Question →'}</Button></div>}
         </div>
      );
   }

   if (phase === 'mastery') {
      const pct = Math.round((testScore / 10) * 100);
      return (
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: `linear-gradient(180deg, ${design.colors.bgPrimary} 0%, #0a0908 100%)`, fontFamily: design.font.sans, position: 'relative', overflow: 'hidden' }}>
            {Array.from({ length: 40 }).map((_, i) => (<div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px', width: '10px', height: '10px', background: [design.colors.primary, design.colors.secondary, design.colors.success, design.colors.warning][i % 4], borderRadius: '2px', animation: `confetti 3s ease-out ${Math.random() * 2}s infinite` }} />))}
            <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
            <ProgressBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
               <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `linear-gradient(135deg, ${design.colors.primary} 0%, ${design.colors.primaryHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: design.shadow.glow(design.colors.primary) }}><span style={{ fontSize: '48px' }}>🏆</span></div>
               <h1 style={{ fontSize: '32px', fontWeight: 800, color: design.colors.textPrimary, marginBottom: '8px' }}>Heat Transfer Master!</h1>
               <p style={{ fontSize: '18px', color: design.colors.textSecondary, marginBottom: '32px' }}>You scored <span style={{ color: design.colors.success, fontWeight: 700 }}>{testScore}/10</span> ({pct}%)</p>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '360px', width: '100%', marginBottom: '32px' }}>
                  {[{ icon: '🔵', label: 'Diffusion = Random' }, { icon: '🔴', label: 'Convection = Currents' }, { icon: '🌡️', label: 'Heat drives flow' }, { icon: '⚡', label: 'Convection is faster' }].map((item, i) => (<div key={i} style={{ padding: '16px', borderRadius: design.radius.md, background: design.colors.bgSecondary, border: `1px solid ${design.colors.border}` }}><div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div><div style={{ fontSize: '12px', color: design.colors.textSecondary }}>{item.label}</div></div>))}
               </div>
               <Button onClick={() => emit('game_completed', { score: testScore, maxScore: 10 })}>Complete Lesson ✓</Button>
            </div>
         </div>
      );
   }

   return null;
};

export default DiffusionConvectionRenderer;
