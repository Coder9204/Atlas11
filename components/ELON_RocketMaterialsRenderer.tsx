'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ELON_RocketMaterialsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const testQuestions = [
  {
    scenario: 'A launch vehicle engineer is sizing the first stage tanks. The Tsiolkovsky rocket equation shows that delta-v depends logarithmically on the mass ratio. Even small reductions in structural mass yield disproportionate payload gains.',
    question: 'According to the Tsiolkovsky equation, which factor has the GREATEST impact on increasing delta-v for a given propellant?',
    options: [
      { text: 'Doubling engine thrust', correct: false },
      { text: 'Reducing structural mass fraction', correct: true },
      { text: 'Increasing tank wall thickness', correct: false },
      { text: 'Adding more fins for stability', correct: false }
    ],
    explanation: 'The Tsiolkovsky equation (delta-v = Isp * g * ln(m0/mf)) shows that reducing structural mass increases the mass ratio logarithmically, yielding more delta-v per kilogram saved than any other factor. Thrust affects acceleration but not the total velocity change achievable.'
  },
  {
    scenario: 'A team is comparing two rocket designs with identical propellant loads and engines. Design A has a structural mass fraction of 0.06 while Design B has 0.10. Both carry RP-1/LOX propellant.',
    question: 'What is the primary advantage of Design A\'s lower mass fraction?',
    options: [
      { text: 'Higher combustion chamber pressure', correct: false },
      { text: 'Greater payload capacity to orbit', correct: true },
      { text: 'Reduced aerodynamic drag', correct: false },
      { text: 'Better propellant mixing', correct: false }
    ],
    explanation: 'A lower structural mass fraction means less of the rocket\'s total mass is dedicated to structure, leaving more mass budget for payload. The relationship is direct: every kilogram saved in structure is a kilogram gained in payload capacity, making structural efficiency paramount in rocket design.'
  },
  {
    scenario: 'SpaceX chose 301 stainless steel for the Starship vehicle, surprising many engineers who expected carbon fiber or aluminum-lithium alloy. The steel is far denser than either alternative at 8000 kg/m3 vs ~1600 kg/m3 for carbon fiber.',
    question: 'Why might stainless steel be advantageous despite being 5x denser than carbon fiber?',
    options: [
      { text: 'It has a higher specific impulse', correct: false },
      { text: 'It is transparent to radio waves', correct: false },
      { text: 'It retains strength at both cryogenic and reentry temperatures', correct: true },
      { text: 'It is lighter per unit volume', correct: false }
    ],
    explanation: 'Stainless steel 301 maintains excellent mechanical properties from -253C (liquid hydrogen temperatures) up to ~870C during atmospheric reentry. This eliminates the need for a separate thermal protection system, saving overall system mass despite the higher material density. The dual-temperature capability is unique among common structural materials.'
  },
  {
    scenario: 'A pressure vessel engineer is designing propellant tanks for a new upper stage. The tanks must withstand internal pressures of 3-5 atmospheres while minimizing wall thickness. Hoop stress in a cylindrical vessel equals pressure times radius divided by wall thickness.',
    question: 'For a given internal pressure, how does increasing tank diameter affect required wall thickness?',
    options: [
      { text: 'Wall thickness decreases with larger diameter', correct: false },
      { text: 'Wall thickness is independent of diameter', correct: false },
      { text: 'Wall thickness increases linearly with diameter', correct: true },
      { text: 'Wall thickness increases with the square of diameter', correct: false }
    ],
    explanation: 'The hoop stress formula (sigma = P*r/t) shows that for constant pressure and allowable stress, wall thickness must increase linearly with radius. This is why hydrogen tanks (which are much larger due to hydrogen\'s low density) require proportionally thicker walls, adding structural mass beyond what the volume increase alone would suggest.'
  },
  {
    scenario: 'At cryogenic temperatures (-183C for LOX, -253C for LH2), material properties change dramatically. Some metals become brittle while others actually get stronger. The choice of tank material must account for operation at these extreme temperatures.',
    question: 'Which material behavior at cryogenic temperatures is MOST dangerous for rocket tanks?',
    options: [
      { text: 'Increased thermal conductivity', correct: false },
      { text: 'Ductile-to-brittle transition in carbon steel', correct: true },
      { text: 'Reduced electrical resistance', correct: false },
      { text: 'Higher coefficient of thermal expansion', correct: false }
    ],
    explanation: 'Carbon steel undergoes a ductile-to-brittle transition at low temperatures, meaning it can shatter catastrophically without warning under cryogenic conditions. This is why rocket tanks use austenitic stainless steel, aluminum alloys, or nickel alloys that remain ductile at cryogenic temperatures. The brittle fracture risk makes ordinary structural steels completely unsuitable for cryogenic service.'
  },
  {
    scenario: 'During ascent, a rocket experiences intense aerodynamic heating on its nose cone and leading edges. The thermal protection system must shield the structure from temperatures that can exceed 1650C during reentry from orbit.',
    question: 'What is the main tradeoff when adding ablative thermal protection to a rocket?',
    options: [
      { text: 'It increases structural mass fraction, reducing payload', correct: true },
      { text: 'It increases specific impulse', correct: false },
      { text: 'It reduces tank pressure capacity', correct: false },
      { text: 'It improves cryogenic performance', correct: false }
    ],
    explanation: 'Ablative thermal protection tiles, blankets, or coatings add dead weight to the vehicle that provides no structural benefit. Every kilogram of TPS is a kilogram subtracted from payload capacity. This is why materials that can serve as both structure and thermal protection (like stainless steel on Starship) offer a compelling system-level advantage despite being denser.'
  },
  {
    scenario: 'A design team is comparing RP-1 (kerosene, density 820 kg/m3) and liquid hydrogen (density 70 kg/m3) as propellants. While LH2 offers higher specific impulse (450s vs 340s), the tank sizing requirements differ dramatically between the two fuels.',
    question: 'By approximately what factor must hydrogen tank volume increase compared to RP-1 tanks for the same propellant mass?',
    options: [
      { text: 'About 2x larger', correct: false },
      { text: 'About 5x larger', correct: false },
      { text: 'About 12x larger', correct: true },
      { text: 'About 50x larger', correct: false }
    ],
    explanation: 'Since LH2 density is about 70 kg/m3 versus RP-1 at 820 kg/m3, the volume ratio is 820/70 which is approximately 11.7x. This enormous volume increase means hydrogen-fueled stages require much larger tanks, more structural material, more insulation, and more surface area for thermal protection. The Isp advantage of hydrogen must be weighed against these significant structural penalties.'
  },
  {
    scenario: 'Manufacturing a rocket requires joining large metal panels into cylindrical tank sections. The welding process must produce joints that are nearly as strong as the parent material, with zero defects that could lead to leaks or structural failure under pressure.',
    question: 'Why is friction stir welding preferred over traditional fusion welding for aluminum rocket tanks?',
    options: [
      { text: 'It is faster and cheaper', correct: false },
      { text: 'It produces stronger joints with fewer defects in aluminum', correct: true },
      { text: 'It works at higher temperatures', correct: false },
      { text: 'It requires less power', correct: false }
    ],
    explanation: 'Friction stir welding is a solid-state process that avoids melting the aluminum, which eliminates porosity, hot cracking, and solidification defects common in fusion welding of aerospace aluminum alloys. The resulting joints retain 80-95% of parent material strength compared to 50-70% for conventional welds. Blue Origin and NASA use this technique extensively for tank manufacturing.'
  },
  {
    scenario: 'A startup is choosing between carbon fiber composite tanks ($150,000/kg saved in structural mass) and aluminum-lithium alloy tanks ($2,000/kg saved). Both achieve the target mass fraction, but the carbon fiber version is 15% lighter overall.',
    question: 'What is the primary factor that makes carbon fiber cost-effective despite being ~75x more expensive per kilogram?',
    options: [
      { text: 'It is easier to recycle after flight', correct: false },
      { text: 'It requires no thermal protection', correct: false },
      { text: 'Each kg of structure saved enables ~20x its mass in additional payload revenue', correct: true },
      { text: 'It reduces fuel consumption by 50%', correct: false }
    ],
    explanation: 'Launch costs of $2,000-5,000/kg to orbit mean each kilogram of structural mass saved translates directly to payload revenue. If a satellite customer pays $5,000/kg, saving 100 kg of structure enables $500,000 in additional revenue per flight across the vehicle lifetime. This payload multiplier effect makes expensive lightweight materials economically justified for expendable vehicles.'
  },
  {
    scenario: 'The structural mass budget for a new medium-lift launch vehicle allocates mass across tanks, interstage, engine mounts, fairing, avionics enclosures, and payload adapter. The team must decide where mass savings will be most impactful.',
    question: 'Which component typically consumes the largest portion of a rocket\'s structural mass budget?',
    options: [
      { text: 'The payload fairing', correct: false },
      { text: 'The avionics bay', correct: false },
      { text: 'The propellant tanks', correct: true },
      { text: 'The engine gimbal mounts', correct: false }
    ],
    explanation: 'Propellant tanks typically account for 60-70% of a rocket\'s total structural mass because they must contain hundreds of tons of cryogenic fluids under pressure while spanning the largest dimensions of the vehicle. This is why tank material selection has the single greatest impact on overall mass fraction and why so much engineering effort focuses on tank wall thickness optimization and lightweight tank materials.'
  }
];

const realWorldApps = [
  {
    icon: '\u{1F680}',
    title: 'SpaceX Starship',
    short: '301 Stainless Steel',
    tagline: 'The counterintuitive heavyweight champion',
    description: 'SpaceX chose 301 stainless steel for Starship, defying decades of aerospace convention that demanded lightweight alloys. The steel is 5x denser than carbon fiber but performs double duty as both structure and heat shield, surviving the extreme temperatures of both cryogenic propellant storage and atmospheric reentry.',
    connection: 'This directly demonstrates the mass fraction tradeoff: a heavier material can reduce TOTAL system mass when it eliminates the need for a separate thermal protection system. The steel\'s strength at -253C for liquid methane/LOX and at 1100C during reentry means Starship needs no tiles on its windward steel surfaces, saving hundreds of kilograms of TPS.',
    howItWorks: 'Starship uses 304L stainless steel welded into barrel sections, with 301 cold-rolled steel for high-stress areas. The steel forms a monocoque pressure vessel that bears all flight loads while containing cryogenic propellants. During reentry, transpiration cooling through micro-pores in the steel surface dissipates heat.',
    stats: [
      { value: '8000 kg/m\u00B3', label: 'Steel density' },
      { value: '-253\u00B0C to 1100\u00B0C', label: 'Operating range' },
      { value: '$3/kg', label: 'Raw material cost' }
    ],
    examples: ['Barrel section welding', 'Header tank construction', 'Heat shield tiles on leeward side'],
    companies: ['SpaceX', 'Boca Chica production facility'],
    futureImpact: 'Stainless steel construction enables rapid iteration at low cost, potentially making rocket production more like shipbuilding than aerospace manufacturing.',
    color: '#94a3b8'
  },
  {
    icon: '\u{1F30F}',
    title: 'Rocket Lab Electron',
    short: 'Carbon Fiber Composite',
    tagline: 'Ultralight structure at premium cost',
    description: 'Rocket Lab\'s Electron is the first orbital rocket with all-composite primary structure including propellant tanks. Carbon fiber composite tanks reduce structural mass fraction to under 0.05, critical for a small launcher where every gram counts toward the tiny 300 kg payload capacity.',
    connection: 'For small launchers, mass fraction dominance is paramount because the Tsiolkovsky equation is unforgiving at small scales. Carbon fiber\'s strength-to-weight ratio of 2457 kN*m/kg (vs 254 for steel) enables Electron to achieve orbital velocity despite its small size, but at extreme manufacturing cost per vehicle.',
    howItWorks: 'Electron\'s tanks are filament-wound carbon fiber pressure vessels with a polymer liner for propellant compatibility. The composite layup is optimized for biaxial stress from internal pressure and axial flight loads. Automated fiber placement ensures consistent quality across the thin-walled structure.',
    stats: [
      { value: '1600 kg/m\u00B3', label: 'Composite density' },
      { value: '<0.05', label: 'Mass fraction achieved' },
      { value: '~$150K/kg saved', label: 'Material cost' }
    ],
    examples: ['Filament-wound LOX tank', 'Composite interstage', 'Carbon fiber fairing halves'],
    companies: ['Rocket Lab', 'Automated fiber placement partners'],
    futureImpact: 'As carbon fiber costs decrease with automotive industry scale, composite tanks may become standard for expendable small and medium launchers.',
    color: '#a78bfa'
  },
  {
    icon: '\u{2B50}',
    title: 'ULA Vulcan Centaur',
    short: 'Aluminum-Lithium Alloy',
    tagline: 'The aerospace industry standard evolved',
    description: 'ULA\'s Vulcan Centaur uses aluminum-lithium alloy (Al-Li 2195) for its Centaur V upper stage tanks. This alloy is 5% less dense and 10% stiffer than conventional aerospace aluminum 2219, representing decades of metallurgical refinement for cryogenic tank applications.',
    connection: 'Al-Li alloys show how incremental mass fraction improvements compound through the Tsiolkovsky equation. A 5% density reduction in tank walls directly reduces structural fraction, and the improved stiffness allows thinner walls for the same buckling resistance, compounding the mass savings.',
    howItWorks: 'Al-Li 2195 panels are formed into curved sections and joined by friction stir welding into cylindrical barrel segments. The alloy\'s excellent fracture toughness at cryogenic temperatures makes it ideal for LOX and LH2 tanks. Isogrid machining patterns on the inner surface provide stiffening without separate stringers.',
    stats: [
      { value: '2630 kg/m\u00B3', label: 'Al-Li density' },
      { value: '+10%', label: 'Stiffness vs standard Al' },
      { value: '40+ year', label: 'Heritage in space' }
    ],
    examples: ['Centaur V LH2 tank', 'Isogrid-stiffened panels', 'Friction stir welded domes'],
    companies: ['ULA', 'Lockheed Martin', 'Constellium'],
    futureImpact: 'Next-generation Al-Li alloys with scandium additions may push aluminum performance closer to composites at a fraction of the cost.',
    color: '#60a5fa'
  },
  {
    icon: '\u{1F527}',
    title: 'Blue Origin New Glenn',
    short: 'Aluminum with Friction Stir Welding',
    tagline: 'Proven material, advanced manufacturing',
    description: 'Blue Origin\'s New Glenn uses conventional aluminum alloy (primarily 2219) but achieves competitive mass fractions through advanced friction stir welding. This approach prioritizes manufacturing reliability and weld quality over exotic materials, reflecting Blue Origin\'s "gradatim ferociter" (step by step, ferociously) philosophy.',
    connection: 'New Glenn demonstrates that manufacturing technique matters as much as material selection for mass fraction. Friction stir welding produces joints at 90%+ of parent material strength versus 60% for conventional TIG welding, allowing thinner tank walls and lower structural mass without changing the base alloy.',
    howItWorks: 'Massive aluminum panels are formed and then joined using a friction stir welding tool that rotates at high speed while traversing the joint line. The process generates frictional heat that plasticizes the aluminum without melting it, producing a solid-state bond free of porosity and hot cracking defects common in fusion welding.',
    stats: [
      { value: '2780 kg/m\u00B3', label: 'Al 2219 density' },
      { value: '90%+', label: 'Weld joint efficiency' },
      { value: '7m', label: 'Tank diameter' }
    ],
    examples: ['First stage LOX tank', 'Second stage propellant tanks', 'Dome-to-barrel weld joints'],
    companies: ['Blue Origin', 'NASA Marshall (FSW pioneer)'],
    futureImpact: 'Friction stir welding is expanding to other alloys and even dissimilar metal joints, potentially enabling multi-material tank designs that optimize mass at each location.',
    color: '#34d399'
  }
];

const ELON_RocketMaterialsRenderer: React.FC<ELON_RocketMaterialsRendererProps> = ({ onGameEvent, gamePhase }) => {
  const validPhases: Phase[] = ['hook','predict','play','review','twist_predict','twist_play','twist_review','transfer','test','mastery'];
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();
const isNavigating = useRef(false);
  const [animFrame, setAnimFrame] = useState(0);
  const [massFraction, setMassFraction] = useState(0.08);
  const [useLH2, setUseLH2] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [selectedApp, setSelectedApp] = useState(0);

  // Physics calculations
  const g = 9.81;
  const isp = useLH2 ? 450 : 340;
  const propellantFraction = 0.85;
  const structuralFraction = massFraction;
  const payloadFraction = Math.max(0, 1 - propellantFraction - structuralFraction);
  const massRatio = 1 / (structuralFraction + payloadFraction);
  const deltaV = isp * g * Math.log(massRatio);
  const tankVolume = useLH2 ? 1000 / 70 : 1000 / 820;

  // Material properties for radar chart
  const materials = {
    steel: { name: 'Stainless Steel', strength: 0.7, density: 0.9, cryoPerf: 0.95, heatResist: 0.95, cost: 0.95, weldability: 0.85, color: '#94a3b8' },
    aluminum: { name: 'Aluminum-Li', strength: 0.6, density: 0.35, cryoPerf: 0.85, heatResist: 0.3, cost: 0.6, weldability: 0.7, color: '#60a5fa' },
    carbon: { name: 'Carbon Fiber', strength: 0.95, density: 0.15, cryoPerf: 0.5, heatResist: 0.2, cost: 0.1, weldability: 0.1, color: '#a78bfa' },
    titanium: { name: 'Titanium', strength: 0.85, density: 0.5, cryoPerf: 0.9, heatResist: 0.7, cost: 0.2, weldability: 0.3, color: '#34d399' }
  };

  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    steel: '#94a3b8',
    aluminum: '#60a5fa',
    carbon: '#a78bfa',
    titanium: '#34d399',
  };

  const typo = {
    h1: { fontSize: '28px', fontWeight: '800' as const, letterSpacing: '-0.02em', lineHeight: '1.2' },
    h2: { fontSize: '22px', fontWeight: '700' as const, letterSpacing: '-0.01em', lineHeight: '1.3' },
    h3: { fontSize: '18px', fontWeight: '600' as const, lineHeight: '1.4' },
    body: { fontSize: '16px', fontWeight: '400' as const, lineHeight: '1.7' },
    small: { fontSize: '14px', fontWeight: '400' as const, lineHeight: '1.6' },
    caption: { fontSize: '12px', fontWeight: '500' as const, lineHeight: '1.5', letterSpacing: '0.02em' },
  };

  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Play', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Play', twist_review: 'Twist Review',
    transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
  };

  // Mobile detection
// Animation loop
  useEffect(() => {
    const interval = setInterval(() => setAnimFrame(f => f + 1), 60);
    return () => clearInterval(interval);
  }, []);

  // Sync with external gamePhase
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Game start event
  useEffect(() => {
    onGameEvent?.({
      eventType: 'game_started',
      gameType: 'rocket-materials',
      gameTitle: 'Rocket Materials',
      details: { initialPhase: phase },
      timestamp: Date.now()
    });
  }, []);

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown>) => {
    onGameEvent?.({
      eventType,
      gameType: 'rocket-materials',
      gameTitle: 'Rocket Materials',
      details,
      timestamp: Date.now()
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    emitEvent('phase_changed', { from: phase, to: newPhase });
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent]);

  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx < validPhases.length - 1) {
      goToPhase(validPhases[idx + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const idx = validPhases.indexOf(phase);
    if (idx > 0) {
      goToPhase(validPhases[idx - 1]);
    }
  }, [phase, goToPhase]);

  const allAppsCompleted = completedApps.every(Boolean);

  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 32px',
    background: `linear-gradient(135deg, ${colors.accent}, #ea580c)`,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    boxShadow: `0 4px 15px ${colors.accentGlow}`,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 32px',
    background: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    height: '20px',
    background: `linear-gradient(90deg, ${colors.success}, ${colors.accent}, ${colors.error})`,
    borderRadius: '10px',
    outline: 'none',
    cursor: 'pointer',
    accentColor: colors.accent,
  };

  const renderProgressBar = () => {
    const idx = validPhases.indexOf(phase);
    const progress = ((idx + 1) / validPhases.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: colors.bgSecondary, zIndex: 1001 }}>
        <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${colors.accent}, #ea580c)`, transition: 'width 0.5s ease' }} />
      </div>
    );
  };

  const renderNavDots = () => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {validPhases.map((p, i) => {
        const isActive = p === phase;
        const isCompleted = validPhases.indexOf(phase) > i;
        return (
          <button
            key={p}
            data-navigation-dot="true"
            aria-label={phaseLabels[p]}
            onClick={() => {
              if (isCompleted || isActive) goToPhase(p);
            }}
            style={{
              width: isActive ? 24 : 8,
              minHeight: 44,
              borderRadius: 4,
              background: isActive ? colors.accent : isCompleted ? colors.success : colors.border,
              cursor: isCompleted || isActive ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
              opacity: isCompleted || isActive ? 1 : 0.5,
              border: 'none',
              padding: 0,
            }}
          />
        );
      })}
    </div>
  );

  const NavigationBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: `linear-gradient(to top, ${colors.bgPrimary}, ${colors.bgPrimary}ee)`,
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    }}>
      {children}
    </div>
  );

  // Material color for rocket SVG based on mass fraction
  const getMaterialColor = () => {
    if (massFraction < 0.05) return colors.carbon;
    if (massFraction < 0.08) return colors.aluminum;
    if (massFraction < 0.11) return colors.titanium;
    return colors.steel;
  };

  const getMaterialName = () => {
    if (massFraction < 0.05) return 'Carbon Fiber';
    if (massFraction < 0.08) return 'Aluminum-Li';
    if (massFraction < 0.11) return 'Titanium';
    return 'Stainless Steel';
  };

  // Rocket cross-section SVG
  const renderRocketSVG = () => {
    const matColor = getMaterialColor();
    const pulse = Math.sin(animFrame * 0.05) * 0.15 + 0.85;
    const engineGlow = Math.sin(animFrame * 0.08) * 0.3 + 0.7;
    const tankHeight = useLH2 ? 140 : 80;
    const totalHeight = 320 + (useLH2 ? 60 : 0);

    return (
      <svg viewBox={`0 0 240 ${totalHeight}`} style={{ width: '100%', maxWidth: '280px', height: 'auto' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="E L O N_ Rocket Materials visualization">
        <defs>
          <linearGradient id="rocketBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={matColor} stopOpacity={0.6} />
            <stop offset="50%" stopColor={matColor} stopOpacity={1} />
            <stop offset="100%" stopColor={matColor} stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#ea580c" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="loxGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="exhaustGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={engineGlow} />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="engineGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Fairing / Nose cone */}
        <path
          d={`M120 5 L150 70 L90 70 Z`}
          fill="url(#rocketBody)"
          stroke={matColor}
          strokeWidth="1.5"
          opacity={pulse}
        />
        <path
          d={`M105 15 L135 15 L95 55 Z`}
          fill={matColor}
          opacity={0.3}
        />

        {/* Payload section */}
        <rect x="88" y="70" width="64" height="35" rx="3" fill={colors.bgCard} stroke={matColor} strokeWidth="1.5" opacity={0.9} />
        <text x="120" y="92" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">PAYLOAD</text>

        {/* LOX Tank */}
        <path
          d={`M85 108 L155 108 L155 173 Z`}
          fill="url(#loxGrad)"
          stroke={matColor}
          strokeWidth="1.5"
        />
        <text x="120" y={108 + 35} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">LOX</text>
        <text x="120" y={108 + 48} textAnchor="middle" fill={colors.textSecondary} fontSize="11">-183\u00B0C</text>

        {/* Intertank */}
        <rect x="85" y={175} width="70" height="12" fill={matColor} opacity={0.5} stroke={matColor} strokeWidth="1" />

        {/* Fuel Tank (RP-1 or LH2) */}
        <path
          d={`M85 186 L155 186 L155 ${189+tankHeight+10} L85 ${189+tankHeight+10} Z`}
          fill={useLH2 ? 'url(#loxGrad)' : 'url(#fuelGrad)'}
          stroke={matColor}
          strokeWidth="1.5"
          opacity={0.9}
        />
        <text x="120" y={189 + tankHeight / 2} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">
          {useLH2 ? 'LH2' : 'RP-1'}
        </text>
        <text x="120" y={189 + tankHeight / 2 + 15} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          {useLH2 ? '-253\u00B0C' : '~20\u00B0C'}
        </text>

        {/* Engine section */}
        <path
          d={`M90 ${189+tankHeight+12} L155 ${189+tankHeight+30} Z`}
          fill={matColor}
          opacity={0.7}
          stroke={matColor}
          strokeWidth="1"
        />

        {/* Engine bell */}
        <path
          d={`M100 ${189+tankHeight+30} L148 ${189+tankHeight+55} L92 ${189+tankHeight+55} Z`}
          fill="#374151"
          stroke={colors.textMuted}
          strokeWidth="1.5"
        />

        {/* Exhaust plume */}
        <path
          d={`M98 ${189+tankHeight+55} L120 ${189+tankHeight+90} L142 ${189+tankHeight+55}`}
          fill="url(#exhaustGrad)"
          filter="url(#engineGlowFilter)"
        />

        {/* Glow circle at engine */}
        <circle
          cx="120"
          cy={189 + tankHeight + 55}
          r={8}
          fill="#f97316"
          opacity={engineGlow * 0.6}
          filter="url(#glowFilter)"
        />

        {/* Structural wall thickness indicator */}
        <rect
          x="158"
          y="108"
          width={Math.max(2, massFraction * 80)}
          height={tankHeight + 80}
          fill={matColor}
          opacity={0.4}
          rx="1"
        />
        <text x="170" y="100" textAnchor="middle" fill={colors.textMuted} fontSize="11">Wall</text>

        {/* Material label */}
        <text x="38" y="150" textAnchor="middle" fill={matColor} fontSize="11" fontWeight="600" transform="rotate(-90, 38, 150)">
          {getMaterialName()}
        </text>

        {/* Dimension lines */}
        <path d={`M75 70 L75 ${189 + tankHeight + 30}`} stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="3,3" opacity={0.5} />
        <text x="70" y={130 + tankHeight / 2} textAnchor="end" fill={colors.textMuted} fontSize="11" transform={`rotate(-90, 70, ${130 + tankHeight / 2})`}>
          {useLH2 ? 'Larger tanks' : 'Standard tanks'}
        </text>
      </svg>
    );
  };

  // Radar chart for material properties
  const renderRadarChart = () => {
    const props = ['strength', 'density', 'cryoPerf', 'heatResist', 'cost', 'weldability'] as const;
    const labels = ['Strength', 'Low Density', 'Cryo Perf', 'Heat Resist', 'Low Cost', 'Weldability'];
    const cx = 120, cy = 110, r = 80;
    const angleStep = (2 * Math.PI) / props.length;

    const getPoint = (value: number, i: number) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x: cx + r * value * Math.cos(angle),
        y: cy + r * value * Math.sin(angle)
      };
    };

    const makePolygon = (mat: typeof materials.steel) => {
      return props.map((p, i) => {
        const pt = getPoint(mat[p], i);
        return `${pt.x},${pt.y}`;
      }).join(' ');
    };

    return (
      <svg viewBox="0 0 240 230" style={{ width: '100%', maxWidth: '320px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <polygon
            key={scale}
            points={props.map((_, i) => {
              const pt = getPoint(scale, i);
              return `${pt.x},${pt.y}`;
            }).join(' ')}
            fill="none"
            stroke={colors.border}
            strokeWidth="0.5"
            opacity={0.5}
          />
        ))}
        {/* Axis lines */}
        {props.map((_, i) => {
          const pt = getPoint(1, i);
          return <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke={colors.border} strokeWidth="0.5" opacity={0.3} />;
        })}
        {/* Material polygons */}
        {Object.values(materials).map((mat, mi) => (
          <polygon
            key={mi}
            points={makePolygon(mat)}
            fill={mat.color}
            fillOpacity={0.1}
            stroke={mat.color}
            strokeWidth="1.5"
            opacity={0.8}
          />
        ))}
        {/* Labels */}
        {labels.map((label, i) => {
          const pt = getPoint(1.18, i);
          return (
            <text key={i} x={pt.x} y={pt.y} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="500">
              {label}
            </text>
          );
        })}
        {/* Legend */}
        {Object.values(materials).map((mat, i) => (
          <g key={i}>
            <rect x={10} y={200 + i * 0} width="0" height="0" fill="none" />
          </g>
        ))}
      </svg>
    );
  };

  // Material legend
  const renderMaterialLegend = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
      {Object.values(materials).map((mat, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: mat.color }} />
          <span style={{ ...typo.caption, color: colors.textMuted }}>{mat.name}</span>
        </div>
      ))}
    </div>
  );

  // Stats display
  const renderStats = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
      {[
        { label: 'Delta-V', value: `${(deltaV / 1000).toFixed(2)} km/s`, color: colors.accent },
        { label: 'Payload Fraction', value: `${(payloadFraction * 100).toFixed(1)}%`, color: payloadFraction > 0 ? colors.success : colors.error },
        { label: 'Mass Ratio', value: massRatio.toFixed(2), color: colors.aluminum },
        { label: 'Tank Volume', value: `${tankVolume.toFixed(1)} m\u00B3/t`, color: useLH2 ? colors.carbon : colors.titanium },
      ].map((stat, i) => (
        <div key={i} style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '12px',
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}>
          <div style={{ ...typo.caption, color: colors.textMuted, marginBottom: '4px' }}>{stat.label}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
        </div>
      ))}
    </div>
  );

  const renderDeltaVChart = (isStatic: boolean = false) => {
    const cW=360,cH=280,pL=55,pR=20,pT=25,pB=45,pW=285,pH=210;
    const dvMaxRef=isp*g*Math.log(1/0.03)/1000;
    const pts:{x:number;y:number;dv:number}[]=[];
    for(let i=0;i<=20;i++){const mf=0.03+0.12*i/20;const pf=Math.max(0,1-propellantFraction-mf);const mr=1/(mf+pf);const dv=isp*g*Math.log(1/mf)/1000;pts.push({x:pL+((mf-0.03)/0.12)*pW,y:pT+pH-(dv/dvMaxRef)*pH,dv});}
    const pathD=pts.map(function(p,i){return (i<1?"M":"L")+p.x.toFixed(1)+" "+p.y.toFixed(1)}).join(" ");
    const cm=isStatic?0.08:massFraction;
    const cdv=isp*g*Math.log(1/cm)/1000;
    const cx2=pL+((cm-0.03)/0.12)*pW,cy2=pT+pH-(cdv/dvMaxRef)*pH;
    const pc=cm<0.06?"#10B981":cm<0.10?"#F97316":"#EF4444";
    return (
      <svg viewBox={"0 0 "+cW+" "+cH} style={{width:"100%",maxWidth:"400px",height:"auto"}} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="chartCurveGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#10B981"/><stop offset="50%" stopColor="#F97316"/><stop offset="100%" stopColor="#EF4444"/></linearGradient><filter id="ptGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3"/></filter></defs>
        <g className="bg"><rect x={pL} y={pT} width={pW} height={pH} fill="#1a1a24" rx="4"/></g>
        <g className="grid">
          {[0,0.25,0.5,0.75,1].map(function(fr,i){var gy=pT+pH*(1-fr);return <line key={"gy"+i} x1={pL} y1={gy} x2={pL+pW} y2={gy} stroke="#2a2a3a" strokeWidth="0.5" opacity="0.5" strokeDasharray="4,4"/>;})}
          {[0,0.25,0.5,0.75,1].map(function(fr,i){var gx=pL+pW*fr;return <line key={"gx"+i} x1={gx} y1={pT} x2={gx} y2={pT+pH} stroke="#2a2a3a" strokeWidth="0.5" opacity="0.5" strokeDasharray="4,4"/>;})}
        </g>
        <g className="axes">
          <line x1={pL} y1={pT} x2={pL} y2={pT+pH} stroke="#e2e8f0" strokeWidth="1.5"/>
          <line x1={pL} y1={pT+pH} x2={pL+pW} y2={pT+pH} stroke="#e2e8f0" strokeWidth="1.5"/>
          <text x={pL+pW/2} y={pT+pH+38} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Mass Fraction</text>
          <text x="5" y={pT+pH/2} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600" transform={"rotate(-90,5,"+(pT+pH/2)+")"}>dv (km/s)</text>
          {["0.03","0.06","0.09","0.12","0.15"].map(function(lbl,i){var tx=pL+(i/4)*pW;return <text key={"xl"+i} x={tx} y={pT+pH+16} textAnchor="middle" fill="#a8b8c8" fontSize="11">{lbl}</text>;})}
          {[3,6,9,12].map(function(v,i){var ty=pT+pH-(v/dvMaxRef)*pH;return <text key={"yl"+i} x={pL-8} y={ty+4} textAnchor="end" fill="#a8b8c8" fontSize="11">{v}</text>;})}
        </g>
        <g className="curve"><path d={pathD} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/></g>
        <g className="pt">
          <circle cx={cx2} cy={cy2} r={10} fill={pc} opacity={0.3} filter="url(#ptGlow)"/>
          <circle cx={cx2} cy={cy2} r={7} fill={pc} stroke="#ffffff" strokeWidth="2" filter="url(#ptGlow)"/>
          <text x={cx2} y={cy2-14} textAnchor="middle" fill={pc} fontSize="12" fontWeight="700">{cdv.toFixed(1)} km/s</text>
        </g>
      </svg>
    );
  };



  // ========== HOOK PHASE ==========
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.accent}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.accent}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.accent }}>GAME #28 -- ROCKET MATERIALS</span>
              </div>
              <h1 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                What Makes a Rocket Light Enough to Reach Orbit?
              </h1>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A rocket is mostly propellant -- up to 90% of its launch mass is fuel and oxidizer.
                The remaining structure must be as light as possible while containing hundreds of tons
                of cryogenic fluids at extreme pressures. Every gram of structure is a gram stolen from payload.
              </p>
            </div>

            {/* Rocket visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              {renderRocketSVG()}
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Rocket cross-section showing propellant tanks, payload, and engine.
                The wall material determines the structural mass fraction.
              </p>
            </div>

            {/* Key insight cards */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {[
                {
                  title: 'The Mass Fraction Challenge',
                  text: 'A Coke can holds 94% liquid by mass. A rocket tank must do the same while surviving launch vibrations, cryogenic temperatures, and aerodynamic forces.',
                  icon: '\u{2696}'
                },
                {
                  title: 'Material Trade-offs',
                  text: 'Carbon fiber is lightest but shatters on impact. Steel is heaviest but survives reentry heat. Aluminum is in between. Which is best depends on the mission.',
                  icon: '\u{1F9EA}'
                },
                {
                  title: 'The Tyranny of Tsiolkovsky',
                  text: 'The rocket equation is exponential: halving structural mass does NOT double payload. Small mass savings compound through the logarithm to yield outsized gains.',
                  icon: '\u{1F4D0}'
                }
              ].map((card, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>{card.icon}</span>
                  <div>
                    <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>{card.title}</div>
                    <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{card.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar chart preview */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Material Property Comparison</div>
              {renderRadarChart()}
              {renderMaterialLegend()}
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              disabled
              style={{ ...secondaryButtonStyle, opacity: 0.3, cursor: 'not-allowed' }}
            >
              Back
            </button>
            {renderNavDots()}
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Start Exploring
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== PREDICT PHASE ==========
  if (phase === 'predict') {
    const predictionOptions = [
      { id: 'carbon', label: 'Carbon fiber composites -- lightest possible, cost is secondary to performance', color: colors.carbon },
      { id: 'aluminum', label: 'Aluminum-lithium alloy -- best balance of weight, cost, and manufacturability', color: colors.aluminum },
      { id: 'steel', label: 'Stainless steel -- cheap, strong at all temperatures, worth the weight penalty', color: colors.steel },
      { id: 'depends', label: 'It depends entirely on the mission requirements and propellant choice', color: colors.accent },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.accent}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.accent}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.accent }}>PREDICT</span>
              </div>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                What Is the Best Material for Rocket Tanks?
              </h2>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Consider the Tsiolkovsky equation, cryogenic temperatures, manufacturing constraints, and cost.
                Which material philosophy would you choose for a new orbital rocket using RP-1/LOX propellant?
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>Context</div>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 8px 0' }}>
                Your rocket uses RP-1 kerosene (density 820 kg/m3) and liquid oxygen (-183 deg C).
                The total vehicle mass is 500 tonnes at liftoff, with 85% propellant.
                You need to minimize the structural mass fraction to maximize payload to Low Earth Orbit.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                Current industry structural fractions range from 0.04 (best carbon fiber) to 0.12 (heavy steel).
                Each 1% reduction in mass fraction adds roughly 200 kg of payload capacity.
              </p>
            </div>

            <div style={{background:colors.bgCard,borderRadius:"16px",padding:"20px",border:"1px solid "+colors.border,textAlign:"center",marginBottom:"20px"}}>
              <div style={{...typo.h3,color:colors.textPrimary,marginBottom:"12px"}}>Delta-V vs Mass Fraction</div>
              {renderDeltaVChart(true)}
              <p style={{...typo.small,color:colors.textMuted,marginTop:"8px"}}>How does material choice affect this curve?</p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {predictionOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPrediction(opt.id);
                    playSound('click');
                    emitEvent('prediction_made', { prediction: opt.id });
                  }}
                  style={{
                    padding: '16px 20px',
                    background: prediction === opt.id ? `${opt.color}20` : colors.bgSecondary,
                    border: `2px solid ${prediction === opt.id ? opt.color : colors.border}`,
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    ...typo.body,
                  }}
                >
                  <span style={{ color: opt.color, fontWeight: '700' }}>
                    {prediction === opt.id ? '\u25C9 ' : '\u25CB '}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: `${colors.accent}10`,
                borderRadius: '12px',
                border: `1px solid ${colors.accent}30`,
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Interesting choice! Let&apos;s explore how structural mass fraction affects rocket performance
                  and see if the data changes your mind.
                </p>
              </div>
            )}
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              disabled={!prediction}
              style={{ ...primaryButtonStyle, opacity: prediction ? 1 : 0.4, cursor: prediction ? 'pointer' : 'not-allowed' }}
            >
              Test It Out
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== PLAY PHASE ==========
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: isMobile ? '640px' : '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.accent}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.accent}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.accent }}>PLAY -- RP-1/LOX ROCKET</span>
              </div>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: '0 0 8px 0' }}>
                Adjust the Structural Mass Fraction
              </h2>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                This is important in real-world rocket engineering: every gram of structure
                is a gram stolen from payload. Slide to change the structural mass fraction from 0.03 (ultralight carbon fiber)
                to 0.15 (heavy steel). Watch how delta-v and payload fraction respond.
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              {/* Left: SVG visualizations */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {/* Delta-V Chart */}
                <div style={{background:colors.bgCard,borderRadius:"16px",padding:"20px",border:"1px solid "+colors.border,textAlign:"center",marginBottom:"20px"}}>
                  <div style={{...typo.h3,color:colors.textPrimary,marginBottom:"12px"}}>Delta-V vs Mass Fraction</div>
                  {renderDeltaVChart()}
                </div>

                {/* Rocket SVG */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                  marginBottom: '20px',
                  overflow: 'hidden',
                }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Rocket Cross-Section</div>
                  {renderRocketSVG()}
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                {/* Slider */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ ...typo.h3, color: colors.textPrimary }}>Structural Mass Fraction</span>
                    <span style={{
                      ...typo.h2,
                      color: massFraction < 0.06 ? colors.success : massFraction < 0.10 ? colors.accent : colors.error,
                      fontFamily: 'monospace',
                    }}>
                      {massFraction.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.03}
                    max={0.15}
                    step={0.001}
                    value={massFraction}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMassFraction(val);
                      emitEvent('slider_changed', { massFraction: val });
                    }}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ ...typo.caption, color: colors.success }}>0.03 (Carbon Fiber)</span>
                    <span style={{ ...typo.caption, color: colors.error }}>0.15 (Heavy Steel)</span>
                  </div>

                  {/* Material indicator */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: `${getMaterialColor()}15`,
                    borderRadius: '8px',
                    border: `1px solid ${getMaterialColor()}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ ...typo.body, color: getMaterialColor(), fontWeight: '600' }}>
                      Material: {getMaterialName()}
                    </span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>
                      Isp: {isp}s (RP-1/LOX)
                    </span>
                  </div>
                </div>

                {/* Stats */}
                {renderStats()}

                {/* Payload feasibility */}
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: payloadFraction > 0.02 ? `${colors.success}15` : payloadFraction > 0 ? `${colors.warning}15` : `${colors.error}15`,
                  borderRadius: '12px',
                  border: `1px solid ${payloadFraction > 0.02 ? colors.success : payloadFraction > 0 ? colors.warning : colors.error}40`,
                }}>
                  <div style={{ ...typo.h3, color: payloadFraction > 0.02 ? colors.success : payloadFraction > 0 ? colors.warning : colors.error, marginBottom: '4px' }}>
                    {payloadFraction > 0.05 ? 'Excellent Payload Capacity' :
                     payloadFraction > 0.02 ? 'Good Payload Capacity' :
                     payloadFraction > 0 ? 'Marginal -- Very Little Payload' :
                     'No Payload Capacity!'}
                  </div>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {payloadFraction > 0.02 ?
                      `With a mass fraction of ${massFraction.toFixed(3)}, this rocket achieves ${(deltaV/1000).toFixed(2)} km/s of delta-v and can carry ${(payloadFraction * 100).toFixed(1)}% of its mass as payload.` :
                      `A structural mass fraction of ${massFraction.toFixed(3)} leaves almost no room for payload. The structure is too heavy for this propellant combination.`
                    }
                  </p>
                </div>

                {/* Tsiolkovsky equation display */}
                <div style={{
                  marginTop: '16px',
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Tsiolkovsky Rocket Equation</div>
                  <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    color: colors.accent,
                    fontSize: '18px',
                    fontWeight: '700',
                    marginBottom: '12px',
                  }}>
                    {'\u0394'}v = I_sp {'\u00D7'} g {'\u00D7'} ln(m_0 / m_f)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ ...typo.small, color: colors.textMuted }}>
                      <strong style={{ color: colors.textSecondary }}>I_sp:</strong> {isp} s
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>
                      <strong style={{ color: colors.textSecondary }}>g:</strong> 9.81 m/s{'\u00B2'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>
                      <strong style={{ color: colors.textSecondary }}>Mass Ratio:</strong> {massRatio.toFixed(3)}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>
                      <strong style={{ color: colors.textSecondary }}>{'\u0394'}v:</strong> {(deltaV/1000).toFixed(2)} km/s
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
              See Results
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== REVIEW PHASE ==========
  if (phase === 'review') {
    const optimalFraction = 0.05;
    const optimalPayload = 1 - propellantFraction - optimalFraction;
    const optimalMassRatio = 1 / (optimalFraction + optimalPayload);
    const optimalDeltaV = isp * g * Math.log(optimalMassRatio);

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.success}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.success}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.success }}>REVIEW</span>
              </div>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                Material Selection Matters -- A Lot
              </h2>
            </div>

            {/* Comparison table */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Your Choice vs. Optimal</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{
                  padding: '16px',
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.caption, color: colors.textMuted, marginBottom: '8px' }}>YOUR SETTING</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: colors.accent, marginBottom: '4px' }}>
                    {massFraction.toFixed(3)}
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>
                    {'\u0394'}v: {(deltaV / 1000).toFixed(2)} km/s
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    Payload: {(payloadFraction * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: `${colors.success}10`,
                  borderRadius: '12px',
                  border: `1px solid ${colors.success}40`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.caption, color: colors.success, marginBottom: '8px' }}>OPTIMAL (0.05)</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: colors.success, marginBottom: '4px' }}>
                    0.050
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>
                    {'\u0394'}v: {(optimalDeltaV / 1000).toFixed(2)} km/s
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    Payload: {(optimalPayload * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Key insights */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {[
                {
                  title: 'The Logarithmic Trap',
                  text: 'The rocket equation uses a natural logarithm, meaning returns diminish rapidly. Going from 0.10 to 0.08 mass fraction gains more delta-v than going from 0.08 to 0.06. Every gram saved is harder to achieve but more valuable.',
                  color: colors.accent
                },
                {
                  title: 'Material vs. System Mass',
                  text: 'A lighter material (like carbon fiber) reduces tank wall mass but may require additional insulation, liners, or thermal protection. The optimal choice minimizes TOTAL structural mass, not just tank wall mass.',
                  color: colors.aluminum
                },
                {
                  title: 'RP-1/LOX is Forgiving',
                  text: 'RP-1 is liquid at room temperature, so fuel tanks need no insulation or cryogenic-rated materials. Only the LOX tank requires cryo-compatible alloys. This makes RP-1 rockets cheaper and easier to build.',
                  color: colors.success
                },
                {
                  title: 'Your Prediction: ' + (prediction === 'depends' ? 'It Depends' : prediction === 'carbon' ? 'Carbon Fiber' : prediction === 'aluminum' ? 'Aluminum-Li' : 'Steel'),
                  text: prediction === 'depends'
                    ? 'You were right! The best material truly depends on the mission. For RP-1/LOX expendable rockets, carbon fiber offers the best mass fraction. For reusable vehicles, steel may win at the system level.'
                    : prediction === 'carbon'
                    ? 'Carbon fiber does achieve the lowest mass fraction, but its high cost and incompatibility with cryogenic cycling can be limiting. It excels for expendable small launchers like Electron.'
                    : prediction === 'aluminum'
                    ? 'Aluminum-lithium is indeed the industry standard and offers the best all-around balance. Most operational rockets use it for good reason -- it is well-understood and cost-effective.'
                    : 'Steel is heavier but eliminates the need for TPS on reusable vehicles. SpaceX proved this with Starship, but it only works when the thermal protection mass savings outweigh the density penalty.',
                  color: colors.accent
                }
              ].map((insight, i) => (
                <div key={i} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${insight.color}`,
                }}>
                  <div style={{ ...typo.h3, color: insight.color, marginBottom: '6px' }}>{insight.title}</div>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{insight.text}</p>
                </div>
              ))}
            </div>

            {/* Radar chart context */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                No Material Wins on Every Axis
              </div>
              {renderRadarChart()}
              {renderMaterialLegend()}
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Each material excels in different properties. The best choice depends on which properties
                matter most for your specific mission, propellant, and reusability requirements.
              </p>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
              Add a Twist
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== TWIST PREDICT PHASE ==========
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'better', label: 'Payload increases -- LH2 has higher Isp (450s vs 340s), so the rocket gains more delta-v', color: colors.success },
      { id: 'worse', label: 'Payload decreases -- hydrogen is so low-density that tanks become enormous and heavy', color: colors.error },
      { id: 'same', label: 'About the same -- the Isp gain and tank mass penalty roughly cancel out', color: colors.warning },
      { id: 'complicated', label: 'It depends on the structural material -- some handle cryogenic hydrogen better than others', color: colors.accent },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.warning}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.warning}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.warning }}>TWIST -- NEW PROPELLANT</span>
              </div>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                What If We Switch to Liquid Hydrogen?
              </h2>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                LH2/LOX offers a specific impulse of 450 seconds versus 340 for RP-1/LOX -- a 32% improvement.
                But liquid hydrogen has a density of only 70 kg/m{'\u00B3'} compared to RP-1&apos;s 820 kg/m{'\u00B3'}.
                That means hydrogen tanks must be ~12x larger by volume.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>The Hydrogen Challenge</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: colors.bgSecondary, borderRadius: '8px' }}>
                  <div style={{ ...typo.caption, color: colors.accent }}>RP-1 Tank</div>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>{(1000/820).toFixed(1)} m{'\u00B3'}/ton</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>Room temperature</div>
                </div>
                <div style={{ padding: '12px', background: colors.bgSecondary, borderRadius: '8px' }}>
                  <div style={{ ...typo.caption, color: colors.carbon }}>LH2 Tank</div>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>{(1000/70).toFixed(1)} m{'\u00B3'}/ton</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>-253{'\u00B0'}C (!)</div>
                </div>
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px', margin: '12px 0 0 0' }}>
                Larger tanks mean more surface area, thicker walls (hoop stress scales with radius),
                and heavy cryogenic insulation. The tanks also need materials rated for -253{'\u00B0'}C.
              </p>
            </div>

            <div style={{background:colors.bgCard,borderRadius:"16px",padding:"20px",border:"1px solid "+colors.border,textAlign:"center",marginBottom:"20px"}}>
              <div style={{...typo.h3,color:colors.textPrimary,marginBottom:"8px"}}>Current RP-1/LOX Performance</div>
              {renderDeltaVChart(true)}
            </div>

            <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
              How will switching to LH2 affect payload capacity at the same mass fraction?
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {twistOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTwistPrediction(opt.id);
                    playSound('click');
                    emitEvent('prediction_made', { twistPrediction: opt.id });
                  }}
                  style={{
                    padding: '16px 20px',
                    background: twistPrediction === opt.id ? `${opt.color}20` : colors.bgSecondary,
                    border: `2px solid ${twistPrediction === opt.id ? opt.color : colors.border}`,
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    ...typo.body,
                  }}
                >
                  <span style={{ color: opt.color, fontWeight: '700' }}>
                    {twistPrediction === opt.id ? '\u25C9 ' : '\u25CB '}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button
              onClick={() => {
                playSound('click');
                setUseLH2(true);
                nextPhase();
              }}
              disabled={!twistPrediction}
              style={{ ...primaryButtonStyle, opacity: twistPrediction ? 1 : 0.4, cursor: twistPrediction ? 'pointer' : 'not-allowed' }}
            >
              Try LH2
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== TWIST PLAY PHASE ==========
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: isMobile ? '640px' : '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.warning}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.warning}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.warning }}>TWIST PLAY -- LH2/LOX ROCKET</span>
              </div>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: '0 0 8px 0' }}>
                Hydrogen-Fueled Rocket Performance
              </h2>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Now using LH2/LOX (Isp = 450s). Notice how the fuel tank is much larger
                and how the higher Isp affects delta-v at each mass fraction.
              </p>
            </div>

            {/* Educational panel */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                <strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> Switching from RP-1 kerosene to liquid hydrogen dramatically changes the rocket&apos;s tank geometry and structural demands. The hydrogen tank must be ~12x larger by volume, increasing wall thickness and insulation mass under extreme cryogenic conditions (-253&deg;C).
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> As you adjust the structural mass fraction slider and toggle between propellants, observe how the higher Isp of hydrogen boosts delta-v while the enormous tank volume penalizes structural mass -- revealing why many rockets use kerosene first stages with hydrogen upper stages.
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {/* Rocket SVG - now with larger tanks */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                  marginBottom: '20px',
                  overflow: 'hidden',
                }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>
                    {useLH2 ? 'LH2/LOX Rocket (Larger Tanks!)' : 'RP-1/LOX Rocket'}
                  </div>
                  {renderRocketSVG()}
                  {useLH2 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: `${colors.warning}15`,
                      borderRadius: '8px',
                      border: `1px solid ${colors.warning}30`,
                    }}>
                      <span style={{ ...typo.caption, color: colors.warning }}>
                        LH2 tank is ~12x larger by volume -- notice the extended fuel section
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                {/* Propellant toggle */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                }}>
                  <button
                    onClick={() => { setUseLH2(false); playSound('click'); }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: `2px solid ${!useLH2 ? colors.accent : colors.border}`,
                      background: !useLH2 ? `${colors.accent}20` : 'transparent',
                      color: !useLH2 ? colors.accent : colors.textMuted,
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    RP-1/LOX (Isp 340s)
                  </button>
                  <button
                    onClick={() => { setUseLH2(true); playSound('click'); }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: `2px solid ${useLH2 ? colors.carbon : colors.border}`,
                      background: useLH2 ? `${colors.carbon}20` : 'transparent',
                      color: useLH2 ? colors.carbon : colors.textMuted,
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    LH2/LOX (Isp 450s)
                  </button>
                </div>

                {/* Slider */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ ...typo.h3, color: colors.textPrimary }}>Structural Mass Fraction</span>
                    <span style={{
                      ...typo.h2,
                      color: massFraction < 0.06 ? colors.success : massFraction < 0.10 ? colors.accent : colors.error,
                      fontFamily: 'monospace',
                    }}>
                      {massFraction.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.03}
                    max={0.15}
                    step={0.001}
                    value={massFraction}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMassFraction(val);
                      emitEvent('slider_changed', { massFraction: val, propellant: useLH2 ? 'LH2' : 'RP-1' });
                    }}
                    style={sliderStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ ...typo.caption, color: colors.success }}>0.03 (Carbon Fiber)</span>
                    <span style={{ ...typo.caption, color: colors.error }}>0.15 (Heavy Steel)</span>
                  </div>

                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: `${getMaterialColor()}15`,
                    borderRadius: '8px',
                    border: `1px solid ${getMaterialColor()}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ ...typo.body, color: getMaterialColor(), fontWeight: '600' }}>
                      {getMaterialName()}
                    </span>
                    <span style={{ ...typo.small, color: useLH2 ? colors.carbon : colors.accent }}>
                      Isp: {isp}s ({useLH2 ? 'LH2/LOX' : 'RP-1/LOX'})
                    </span>
                  </div>
                </div>

                {/* Stats */}
                {renderStats()}

                {/* LH2 specific warnings */}
                {useLH2 && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: `${colors.warning}10`,
                    borderRadius: '12px',
                    border: `1px solid ${colors.warning}30`,
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Hydrogen Challenges</div>
                    <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '4px' }}>Tank walls must withstand -253{'\u00B0'}C without brittle fracture</li>
                      <li style={{ marginBottom: '4px' }}>Foam insulation adds ~15% to tank structural mass</li>
                      <li style={{ marginBottom: '4px' }}>Hydrogen permeates through many materials, requiring special liners</li>
                      <li>Larger tanks increase aerodynamic drag and require more structural stiffening</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
              Review Twist
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== TWIST REVIEW PHASE ==========
  if (phase === 'twist_review') {
    // Calculate comparison values
    const rp1Isp = 340;
    const lh2Isp = 450;
    const compFraction = 0.08;
    const compPayload = 1 - propellantFraction - compFraction;
    const rp1DV = rp1Isp * g * Math.log(1 / (compFraction + compPayload));
    const lh2DV = lh2Isp * g * Math.log(1 / (compFraction + compPayload));

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.warning}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.warning}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.warning }}>TWIST REVIEW</span>
              </div>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                The Hydrogen Paradox
              </h2>
            </div>

            {/* Delta-V comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Delta-V at Mass Fraction = 0.08
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{
                  padding: '16px',
                  background: `${colors.accent}10`,
                  borderRadius: '12px',
                  border: `1px solid ${colors.accent}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.caption, color: colors.accent }}>RP-1/LOX</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: colors.accent }}>{(rp1DV / 1000).toFixed(2)}</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>km/s delta-v</div>
                </div>
                <div style={{
                  padding: '16px',
                  background: `${colors.carbon}10`,
                  borderRadius: '12px',
                  border: `1px solid ${colors.carbon}30`,
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.caption, color: colors.carbon }}>LH2/LOX</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: colors.carbon }}>{(lh2DV / 1000).toFixed(2)}</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>km/s delta-v</div>
                </div>
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '12px', textAlign: 'center', marginBottom: 0 }}>
                At the same mass fraction, LH2 achieves {((lh2DV / rp1DV - 1) * 100).toFixed(0)}% more delta-v from the Isp advantage alone.
              </p>
            </div>

            {/* The catch */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {[
                {
                  title: 'The Catch: Real Mass Fractions Differ',
                  text: 'Our simple model assumes the same mass fraction for both propellants. In reality, LH2 tanks have higher mass fractions (0.08-0.12) due to their enormous volume, insulation mass, and cryogenic requirements. RP-1 tanks can achieve 0.04-0.07 because they are smaller and warmer.',
                  color: colors.error
                },
                {
                  title: 'Volume Drives Everything',
                  text: 'Hoop stress in a cylindrical tank is proportional to radius. Hydrogen tanks are ~2.3x larger in radius (for the same mass of propellant), requiring ~2.3x thicker walls. Combined with ~12x more surface area needing insulation, the structural penalty is severe.',
                  color: colors.warning
                },
                {
                  title: 'Material Constraints Tighten',
                  text: 'At -253 degrees C, many materials become brittle. Carbon steel shatters. Even some aluminum alloys lose ductility. Only austenitic stainless steel, certain Al-Li alloys, and select composites remain reliable. This limits material choices and often forces heavier solutions.',
                  color: colors.carbon
                },
                {
                  title: 'Your Twist Prediction',
                  text: twistPrediction === 'complicated'
                    ? 'Excellent insight! Material choice and cryogenic requirements indeed complicate the LH2 tradeoff. The higher Isp helps, but the structural penalties often negate much of the gain.'
                    : twistPrediction === 'worse'
                    ? 'You correctly identified the tank sizing problem! While our simplified model shows a delta-v increase from higher Isp, real hydrogen rockets struggle with higher structural mass fractions that partially or fully offset the Isp advantage.'
                    : twistPrediction === 'better'
                    ? 'The Isp gain is real, but in practice, the enormous tank volume and insulation mass push the structural fraction higher. The net benefit of LH2 is much smaller than the raw Isp numbers suggest.'
                    : 'The two effects do partially cancel, but in practice hydrogen tanks are so much larger and heavier that the Isp gain does not fully compensate. The net advantage of LH2 over RP-1 is smaller than most people expect.',
                  color: colors.accent
                }
              ].map((insight, i) => (
                <div key={i} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${insight.color}`,
                }}>
                  <div style={{ ...typo.h3, color: insight.color, marginBottom: '6px' }}>{insight.title}</div>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{insight.text}</p>
                </div>
              ))}
            </div>

            {/* Bottom line */}
            <div style={{
              background: `${colors.accent}10`,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.accent}30`,
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>The Bottom Line</div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Hydrogen is best for upper stages (where high Isp matters most and tank sizes are smaller)
                and kerosene is often preferred for first stages (where dense propellant means compact, lightweight tanks).
                This is why many rockets use RP-1 first stages with LH2 upper stages.
              </p>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button onClick={() => { playSound('click'); setUseLH2(false); nextPhase(); }} style={primaryButtonStyle}>
              Real-World Examples
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== TRANSFER PHASE ==========
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Rocket Materials"
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

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.accent}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.accent}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.accent }}>REAL-WORLD APPLICATIONS</span>
              </div>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: '0 0 8px 0' }}>
                How Industry Solves the Materials Problem
              </h2>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Four different companies, four different material choices. Explore each approach
                and understand why each makes sense for its specific context.
              </p>
            </div>

            {/* App selector tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '20px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedApp(i); playSound('click'); }}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '10px',
                    border: `2px solid ${selectedApp === i ? a.color : colors.border}`,
                    background: selectedApp === i ? `${a.color}15` : colors.bgCard,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ ...typo.caption, color: selectedApp === i ? a.color : colors.textMuted, fontSize: '10px' }}>
                    {a.short}
                  </div>
                  {completedApps[i] && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: colors.success,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#fff',
                    }}>
                      {'\u2713'}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected app detail */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${app.color}40`,
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '36px' }}>{app.icon}</span>
                <div>
                  <div style={{ ...typo.h2, color: colors.textPrimary }}>{app.title}</div>
                  <div style={{ ...typo.small, color: app.color, fontWeight: '600' }}>{app.tagline}</div>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, margin: '0 0 16px 0' }}>{app.description}</p>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    padding: '12px 8px',
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: app.color, marginBottom: '2px' }}>{stat.value}</div>
                    <div style={{ ...typo.caption, color: colors.textMuted, fontSize: '10px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Connection to concepts */}
              <div style={{
                padding: '16px',
                background: `${app.color}10`,
                borderRadius: '12px',
                border: `1px solid ${app.color}30`,
                marginBottom: '16px',
              }}>
                <div style={{ ...typo.h3, color: app.color, marginBottom: '6px' }}>Connection to Mass Fraction</div>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
              </div>

              {/* How it works */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '6px' }}>How It Works</div>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
              </div>

              {/* Examples */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.caption, color: colors.textMuted, marginBottom: '6px' }}>KEY EXAMPLES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      padding: '4px 10px',
                      background: colors.bgSecondary,
                      borderRadius: '6px',
                      ...typo.caption,
                      color: colors.textSecondary,
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Companies */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...typo.caption, color: colors.textMuted, marginBottom: '6px' }}>COMPANIES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {app.companies.map((co, i) => (
                    <span key={i} style={{
                      padding: '4px 10px',
                      background: `${app.color}15`,
                      borderRadius: '6px',
                      ...typo.caption,
                      color: app.color,
                    }}>
                      {co}
                    </span>
                  ))}
                </div>
              </div>

              {/* Future impact */}
              <div style={{
                padding: '12px 16px',
                background: colors.bgSecondary,
                borderRadius: '8px',
                borderLeft: `3px solid ${app.color}`,
              }}>
                <div style={{ ...typo.caption, color: app.color, marginBottom: '4px' }}>FUTURE IMPACT</div>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
              </div>

              {/* Got It button */}
              {!completedApps[selectedApp] && (
                <button
                  onClick={() => {
                    playSound('click');
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                    emitEvent('button_clicked', { action: 'app_completed', app: app.title });
                    const nextIdx = newCompleted.findIndex(c => !c);
                    if (nextIdx === -1) {
                      setTimeout(() => goToPhase('test'), 400);
                    } else {
                      setSelectedApp(nextIdx);
                    }
                  }}
                  style={{
                    ...primaryButtonStyle,
                    width: '100%',
                    marginTop: '16px',
                    background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  }}
                >
                  Got It!
                </button>
              )}
              {completedApps[selectedApp] && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: `${colors.success}15`,
                  borderRadius: '8px',
                  border: `1px solid ${colors.success}30`,
                  textAlign: 'center',
                }}>
                  <span style={{ ...typo.body, color: colors.success, fontWeight: '600' }}>{'\u2713'} Completed</span>
                </div>
              )}
            </div>

            {/* Progress indicator */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>
                {completedApps.filter(Boolean).length} of 4 applications explored
              </span>
              {allAppsCompleted && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  background: `${colors.success}15`,
                  borderRadius: '8px',
                  border: `1px solid ${colors.success}30`,
                  display: 'inline-block',
                }}>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: '600' }}>
                    All applications explored! Ready to test your knowledge.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
            {renderNavDots()}
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              disabled={!allAppsCompleted}
              style={{ ...primaryButtonStyle, opacity: allAppsCompleted ? 1 : 0.4, cursor: allAppsCompleted ? 'pointer' : 'not-allowed' }}
            >
              Take the Test
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== TEST PHASE ==========
  if (phase === 'test') {
    const q = testQuestions[currentQuestion];
    const selectedAnswer = testAnswers[currentQuestion];
    const allAnswered = testAnswers.every(a => a !== null);

    const handleSubmitTest = () => {
      let score = 0;
      testQuestions.forEach((question, i) => {
        const correctOption = question.options.find(o => o.correct);
        if (testAnswers[i] === correctOption?.text) {
          score++;
        }
      });
      setTestScore(score);
      setTestSubmitted(true);
      playSound(score >= 7 ? 'complete' : 'failure');
      emitEvent('answer_submitted', { score, total: 10, percentage: score * 10 });
      if (score >= 7) {
        emitEvent('achievement_unlocked', { achievement: 'Rocket Materials Master', score });
      }
    };

    if (!testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderProgressBar()}
          <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              {currentQuestion === 0 && !testAnswers[0] && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                      display: 'inline-flex',
                      padding: '8px 16px',
                      background: `${colors.accent}15`,
                      borderRadius: '20px',
                      border: `1px solid ${colors.accent}30`,
                      marginBottom: '16px',
                    }}>
                      <span style={{ ...typo.caption, color: colors.accent }}>KNOWLEDGE TEST</span>
                    </div>
                    <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                      Test Your Understanding
                    </h2>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      Apply your understanding of rocket structural materials, mass fractions,
                      the Tsiolkovsky equation, and cryogenic material properties to answer
                      10 scenario-based questions.
                    </p>
                  </div>
                </>
              )}

              {/* Question counter */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.h3, color: colors.textPrimary }}>
                  Question {currentQuestion + 1} of 10
                </span>
                <span style={{ ...typo.small, color: colors.textMuted }}>
                  {testAnswers.filter(a => a !== null).length} answered
                </span>
              </div>

              {/* Question dots */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {testQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentQuestion(i); playSound('click'); }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: `2px solid ${currentQuestion === i ? colors.accent : testAnswers[i] !== null ? colors.success : colors.border}`,
                      background: testAnswers[i] !== null ? `${colors.success}20` : 'transparent',
                      color: currentQuestion === i ? colors.accent : colors.textMuted,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Scenario */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.border}`,
                marginBottom: '16px',
              }}>
                <div style={{ ...typo.caption, color: colors.accent, marginBottom: '6px' }}>SCENARIO</div>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{q.scenario}</p>
              </div>

              {/* Question */}
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>{q.question}</div>

              {/* Options */}
              <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const updated = [...testAnswers];
                      updated[currentQuestion] = opt.text;
                      setTestAnswers(updated);
                      playSound('click');
                      emitEvent('selection_made', { question: currentQuestion, answer: opt.text });
                    }}
                    style={{
                      padding: '14px 16px',
                      background: selectedAnswer === opt.text ? `${colors.accent}20` : colors.bgSecondary,
                      border: `2px solid ${selectedAnswer === opt.text ? colors.accent : colors.border}`,
                      borderRadius: '10px',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      ...typo.small,
                    }}
                  >
                    <span style={{ color: colors.accent, fontWeight: '700', marginRight: '8px' }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt.text}
                  </button>
                ))}
              </div>

              {/* Navigation between questions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  onClick={() => { if (currentQuestion > 0) { setCurrentQuestion(currentQuestion - 1); playSound('click'); } }}
                  disabled={currentQuestion === 0}
                  style={{ ...secondaryButtonStyle, flex: 1, opacity: currentQuestion === 0 ? 0.3 : 1, cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                {currentQuestion < 9 ? (
                  <button
                    onClick={() => { setCurrentQuestion(currentQuestion + 1); playSound('click'); }}
                    style={{ ...primaryButtonStyle, flex: 1 }}
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitTest}
                    disabled={!allAnswered}
                    style={{ ...primaryButtonStyle, flex: 1, opacity: allAnswered ? 1 : 0.4, cursor: allAnswered ? 'pointer' : 'not-allowed', background: allAnswered ? `linear-gradient(135deg, ${colors.success}, #059669)` : undefined }}
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          </div>
          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => { playSound('click'); prevPhase(); }} style={secondaryButtonStyle}>Back</button>
              {renderNavDots()}
              <div style={{ ...typo.small, color: colors.textMuted }}>
                {allAnswered ? 'Ready to submit!' : `${testAnswers.filter(a => a !== null).length}/10`}
              </div>
            </div>
          </NavigationBar>
        </div>
      );
    }

    // Test results
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
              }}>
                {testScore >= 8 ? '\u{1F680}' : testScore >= 6 ? '\u{1F4AA}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 8px 0' }}>
                {testScore >= 8 ? 'Outstanding!' : testScore >= 6 ? 'Good Work!' : 'Keep Learning!'}
              </h2>
              <div style={{
                fontSize: '48px',
                fontWeight: '900',
                color: testScore >= 7 ? colors.success : testScore >= 5 ? colors.warning : colors.error,
                margin: '8px 0',
              }}>
                {testScore}/10
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                {testScore >= 8
                  ? 'You have an excellent grasp of rocket structural materials and their impact on vehicle performance.'
                  : testScore >= 6
                  ? 'You understand the key concepts well. Review the questions you missed to strengthen your knowledge.'
                  : 'Review the material and try again. Focus on the Tsiolkovsky equation and material tradeoffs.'}
              </p>
            </div>

            {/* Answer Key */}
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
              {testQuestions.map((question, idx) => {
                const correctOption = question.options.find(o => o.correct);
                const isCorrect = testAnswers[idx] === correctOption?.text;
                return (
                  <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                      <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {question.question}</span>
                    </div>
                    {!isCorrect && (
                      <div style={{ marginLeft: '26px', marginBottom: '6px' }}>
                        <span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>{testAnswers[idx] || 'No answer'}</span>
                      </div>
                    )}
                    <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                      <span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.text}</span>
                    </div>
                    {question.explanation && (
                      <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                        <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span>
                        <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{question.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                playSound('click');
              }}
              style={secondaryButtonStyle}
            >
              Retry
            </button>
            {renderNavDots()}
            <button
              onClick={() => { playSound('complete'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              {testScore >= 7 ? 'View Mastery' : 'Continue'}
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // ========== MASTERY PHASE ==========
  if (phase === 'mastery') {
    const learningPoints = [
      {
        title: 'The Tsiolkovsky Equation Governs All',
        description: 'Delta-v depends logarithmically on mass ratio. Every kilogram of structural mass saved yields disproportionate payload gains, making material selection the single most important design decision in rocketry.',
        icon: '\u{1F4D0}'
      },
      {
        title: 'No Perfect Material Exists',
        description: 'Carbon fiber is lightest but expensive and fragile. Steel is heavy but survives extreme temperatures. Aluminum is balanced but cannot handle reentry heat. The best choice depends on mission, propellant, and reusability requirements.',
        icon: '\u{1F9EA}'
      },
      {
        title: 'Propellant Choice Drives Tank Design',
        description: 'Liquid hydrogen offers 32% higher Isp but requires 12x larger tanks at -253 degrees C. This cascading effect on structural mass, insulation, and material constraints often negates much of hydrogen\'s performance advantage.',
        icon: '\u{26FD}'
      },
      {
        title: 'System-Level Thinking Wins',
        description: 'SpaceX chose "heavy" stainless steel because it eliminated the thermal protection system entirely. Optimizing one component in isolation often leads to worse overall vehicle performance.',
        icon: '\u{1F3AF}'
      },
      {
        title: 'Manufacturing Matters as Much as Material',
        description: 'Friction stir welding improved aluminum joint strength by 50% without changing the base alloy. Advances in manufacturing often deliver more mass savings than switching to exotic materials.',
        icon: '\u{1F527}'
      }
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '16px',
                filter: `drop-shadow(0 0 20px ${colors.accentGlow})`,
              }}>
                {'\u{1F680}'}
              </div>
              <div style={{
                display: 'inline-flex',
                padding: '8px 16px',
                background: `${colors.accent}15`,
                borderRadius: '20px',
                border: `1px solid ${colors.accent}30`,
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.caption, color: colors.accent }}>MASTERY ACHIEVED</span>
              </div>
              <h2 style={{ ...typo.h1, color: colors.textPrimary, margin: '0 0 12px 0' }}>
                Rocket Materials Master!
              </h2>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                You&apos;ve explored the fundamental tradeoffs in rocket structural material selection,
                from the Tsiolkovsky equation to cryogenic material science to real-world engineering decisions.
              </p>
            </div>

            {/* Score summary */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.accent}40`,
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: colors.accent }}>{testScore}/10</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>Test Score</div>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: colors.success }}>4/4</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>Apps Explored</div>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: colors.carbon }}>10</div>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>Phases Complete</div>
                </div>
              </div>
            </div>

            {/* Learning points */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
                Key Takeaways
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {learningPoints.map((point, i) => (
                  <div key={i} style={{
                    background: colors.bgCard,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{point.icon}</span>
                    <div>
                      <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>{point.title}</div>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{point.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final rocket visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Your Rocket Design
              </div>
              {renderRocketSVG()}
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px', background: colors.bgSecondary, borderRadius: '8px' }}>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>Material</div>
                  <div style={{ ...typo.body, color: getMaterialColor(), fontWeight: '700' }}>{getMaterialName()}</div>
                </div>
                <div style={{ padding: '8px', background: colors.bgSecondary, borderRadius: '8px' }}>
                  <div style={{ ...typo.caption, color: colors.textMuted }}>Mass Fraction</div>
                  <div style={{ ...typo.body, color: colors.accent, fontWeight: '700' }}>{massFraction.toFixed(3)}</div>
                </div>
              </div>
            </div>

            {/* Completion message */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.accent}15, ${colors.success}15)`,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.accent}30`,
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
                Congratulations!
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                You now understand why rocket engineers agonize over every gram of structural mass
                and why material selection involves complex system-level tradeoffs that go far beyond
                simple strength-to-weight ratios. This knowledge applies to any field where weight
                reduction compounds through exponential or logarithmic relationships.
              </p>
            </div>
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
          <button onClick={() => { emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length }); window.location.href = '/games'; }}
            style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Complete Game {'\u2192'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ELON_RocketMaterialsRenderer;