'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { saveLearnerProfile as saveProfile } from '../services/GameProgressService';
import { createPathFromTemplate } from '../services/LearningPathService';
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackPathEnrolled,
} from '../services/AnalyticsService';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING FLOW - 4-step onboarding for Coach Atlas learning platform
// ─────────────────────────────────────────────────────────────────────────────

// Theme constants
const theme = {
  bgPrimary: '#0a0a0f',
  bgCard: '#1a1a24',
  accent: '#3B82F6',
  textPrimary: '#f0f0f5',
  textSecondary: '#a0a0b0',
  textMuted: '#707080',
  border: '#2a2a3a',
  fontStack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// Categories from GamesPage
const categories: Record<string, { name: string; icon: string; color: string; description: string; count: number }> = {
  mechanics: { name: 'Mechanics', icon: '\u2699\uFE0F', color: '#3B82F6', description: 'Forces, motion, and energy', count: 55 },
  thermodynamics: { name: 'Thermo', icon: '\uD83D\uDD25', color: '#EF4444', description: 'Heat, temperature, and energy transfer', count: 23 },
  electromagnetism: { name: 'E&M', icon: '\u26A1', color: '#F59E0B', description: 'Electric and magnetic phenomena', count: 24 },
  waves: { name: 'Waves & Optics', icon: '\uD83C\uDF0A', color: '#8B5CF6', description: 'Light, sound, and wave behavior', count: 43 },
  fluids: { name: 'Fluids', icon: '\uD83D\uDCA7', color: '#06B6D4', description: 'Liquids, gases, and flow', count: 27 },
  modern: { name: 'Modern', icon: '\u269B\uFE0F', color: '#EC4899', description: 'Quantum and modern physics', count: 3 },
  engineering: { name: 'Engineering', icon: '\uD83D\uDD27', color: '#10B981', description: 'Applied physics and power systems', count: 42 },
  computing: { name: 'Computing & AI', icon: '\uD83D\uDCBB', color: '#6366F1', description: 'Hardware, AI, and ML concepts', count: 33 },
  semiconductor: { name: 'Semiconductor', icon: '\uD83D\uDD2C', color: '#14B8A6', description: 'Chip design and fabrication', count: 29 },
  solar: { name: 'Solar & PV', icon: '\u2600\uFE0F', color: '#FBBF24', description: 'Solar cells and photovoltaics', count: 18 },
  elon: { name: 'ELON', icon: '\uD83D\uDE80', color: '#F97316', description: 'Systems thinking across energy, space, chips', count: 38 },
};

// Goal options for step 1
const goalOptions = [
  { id: 'exam-prep', label: 'Exam Prep', description: 'Preparing for physics or engineering exams', icon: '\uD83D\uDCDD' },
  { id: 'engineering', label: 'Engineering', description: 'Understanding real-world engineering concepts', icon: '\uD83D\uDD27' },
  { id: 'curiosity', label: 'Curiosity', description: 'Exploring STEM topics for fun', icon: '\uD83D\uDD2D' },
  { id: 'career', label: 'Career', description: 'Building skills for a tech career', icon: '\uD83D\uDCBC' },
  { id: 'coursework', label: 'Coursework', description: 'Supplementing school or university courses', icon: '\uD83D\uDCDA' },
];

// Level options for step 3
const levelOptions = [
  {
    id: 'beginner',
    label: 'Beginner',
    color: '#10B981',
    description: 'New to physics. Start with fundamentals and intuitive experiments.',
    icon: '\uD83C\uDF31',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    color: '#F59E0B',
    description: 'Comfortable with basics. Ready for deeper concepts and applications.',
    icon: '\uD83D\uDD2C',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    color: '#EF4444',
    description: 'Strong foundation. Looking for challenging problems and edge cases.',
    icon: '\uD83C\uDFC6',
  },
];

// Curated game recommendations per category + level
const recommendedGames: Record<string, Record<string, { name: string; slug: string }[]>> = {
  mechanics: {
    beginner: [
      { name: 'Pendulum Period', slug: 'pendulum-period' },
      { name: 'Energy Conservation', slug: 'energy-conservation' },
      { name: 'Inclined Plane', slug: 'inclined-plane' },
      { name: 'Hookes Law', slug: 'hookes-law' },
    ],
    intermediate: [
      { name: 'Momentum Conservation', slug: 'momentum-conservation' },
      { name: 'Centripetal Force', slug: 'centripetal-force' },
      { name: 'Forced Oscillations', slug: 'forced-oscillations' },
      { name: 'Coriolis Effect', slug: 'coriolis-effect' },
    ],
    advanced: [
      { name: 'Orbital Mechanics', slug: 'orbital-mechanics' },
      { name: 'Gyroscopic Precession', slug: 'gyroscopic-precession' },
      { name: 'Fracture Mechanics', slug: 'fracture-mechanics' },
      { name: 'Brachistochrone', slug: 'brachistochrone' },
    ],
  },
  thermodynamics: {
    beginner: [
      { name: 'Thermal Expansion', slug: 'thermal-expansion' },
      { name: 'Convection', slug: 'convection' },
      { name: 'Gas Laws', slug: 'gas-laws' },
      { name: 'Evaporative Cooling', slug: 'evaporative-cooling' },
    ],
    intermediate: [
      { name: 'Newton Cooling', slug: 'newton-cooling' },
      { name: 'Phase Change Energy', slug: 'phase-change-energy' },
      { name: 'Kinetic Theory Gases', slug: 'kinetic-theory-gases' },
      { name: 'Latent Heat', slug: 'latent-heat' },
    ],
    advanced: [
      { name: 'Carnot Cycle', slug: 'carnot-cycle' },
      { name: 'Entropy', slug: 'entropy' },
      { name: 'Arrhenius', slug: 'arrhenius' },
    ],
  },
  electromagnetism: {
    beginner: [
      { name: 'Coulombs Law', slug: 'coulombs-law' },
      { name: 'Magnetic Field', slug: 'magnetic-field' },
      { name: 'Circuits', slug: 'circuits' },
      { name: 'Static Electricity', slug: 'static-electricity' },
    ],
    intermediate: [
      { name: 'Electric Field', slug: 'electric-field' },
      { name: 'Electromagnetic Induction', slug: 'electromagnetic-induction' },
      { name: 'Kirchhoffs Laws', slug: 'kirchhoffs-laws' },
      { name: 'Transformer', slug: 'transformer' },
    ],
    advanced: [
      { name: 'LC Resonance', slug: 'l-c-resonance' },
      { name: 'MOSFET Switching', slug: 'm-o-s-f-e-t-switching' },
      { name: 'Power Factor', slug: 'power-factor' },
    ],
  },
  waves: {
    beginner: [
      { name: 'Wave Speed Tension', slug: 'wave-speed-tension' },
      { name: 'Snells Law', slug: 'snells-law' },
      { name: 'Reflection', slug: 'reflection' },
      { name: 'Speed of Sound', slug: 'speed-of-sound' },
    ],
    intermediate: [
      { name: 'Wave Interference', slug: 'wave-interference' },
      { name: 'Diffraction', slug: 'diffraction' },
      { name: 'Doppler Effect', slug: 'doppler-effect' },
      { name: 'Standing Waves', slug: 'standing-waves' },
    ],
    advanced: [
      { name: 'Wave Particle Duality', slug: 'wave-particle-duality' },
      { name: 'Laser Speckle', slug: 'laser-speckle' },
      { name: 'Fresnel Zones', slug: 'fresnel-zones' },
    ],
  },
  fluids: {
    beginner: [
      { name: 'Buoyancy', slug: 'buoyancy' },
      { name: 'Pascal Law', slug: 'pascal-law' },
      { name: 'Hydrostatic Pressure', slug: 'hydrostatic-pressure' },
      { name: 'Siphon', slug: 'siphon' },
    ],
    intermediate: [
      { name: 'Bernoulli', slug: 'bernoulli' },
      { name: 'Venturi Effect', slug: 'venturi-effect' },
      { name: 'Laminar Turbulent', slug: 'laminar-turbulent' },
      { name: 'Magnus Effect', slug: 'magnus-effect' },
    ],
    advanced: [
      { name: 'Cavitation', slug: 'cavitation' },
      { name: 'Marangoni Tears', slug: 'marangoni-tears' },
      { name: 'Karman Vortex', slug: 'karman-vortex' },
      { name: 'Droplet Breakup', slug: 'droplet-breakup' },
    ],
  },
  modern: {
    beginner: [
      { name: 'Photoelectric Effect', slug: 'photoelectric-effect' },
    ],
    intermediate: [
      { name: 'Photoelectric Effect', slug: 'photoelectric-effect' },
    ],
    advanced: [
      { name: 'Molecular Orbitals', slug: 'molecular-orbitals' },
      { name: 'Radiation Effects', slug: 'radiation-effects' },
    ],
  },
  engineering: {
    beginner: [
      { name: 'Microphone', slug: 'microphone' },
      { name: 'Reaction Time', slug: 'reaction-time' },
      { name: 'Straw Instrument', slug: 'straw-instrument' },
      { name: 'Cloud In Bottle', slug: 'cloud-in-bottle' },
    ],
    intermediate: [
      { name: 'Solar Cell', slug: 'solar-cell' },
      { name: 'Server Airflow', slug: 'server-airflow' },
      { name: 'Antenna Gain', slug: 'antenna-gain' },
      { name: 'DC-DC Converter', slug: 'd-c-d-c-converter' },
    ],
    advanced: [
      { name: 'Power Factor', slug: 'power-factor' },
      { name: 'SRAM Cell', slug: 's-r-a-m-cell' },
      { name: 'Power Delivery Network', slug: 'power-delivery-network' },
      { name: 'Space Radiation', slug: 'space-radiation' },
    ],
  },
  computing: {
    beginner: [
      { name: 'Ask for Assumptions', slug: 'ask-for-assumptions' },
    ],
    intermediate: [
      { name: 'GPU Power States', slug: 'g-p-u-power-states' },
      { name: 'Memory Hierarchy', slug: 'memory-hierarchy' },
      { name: 'Attention Memory', slug: 'attention-memory' },
      { name: 'Quantization Precision', slug: 'quantization-precision' },
    ],
    advanced: [
      { name: 'Tensor Core', slug: 'tensor-core' },
      { name: 'Systolic Array', slug: 'systolic-array' },
      { name: 'AI Inference Latency', slug: 'a-i-inference-latency' },
      { name: 'Energy Per Token', slug: 'energy-per-token' },
    ],
  },
  semiconductor: {
    beginner: [
      { name: 'Photolithography', slug: 'photolithography' },
      { name: 'ESD Protection', slug: 'e-s-d-protection' },
    ],
    intermediate: [
      { name: 'Cleanroom Yield', slug: 'cleanroom-yield' },
      { name: 'Doping Diffusion', slug: 'doping-diffusion' },
      { name: 'Process Variation', slug: 'process-variation' },
      { name: 'Chiplets vs Monoliths', slug: 'chiplets-vs-monoliths' },
    ],
    advanced: [
      { name: 'Clock Distribution', slug: 'clock-distribution' },
      { name: 'Electromigration', slug: 'electromigration' },
      { name: 'CMP Planarization', slug: 'c-m-p-planarization' },
      { name: 'Chiplet Architecture', slug: 'chiplet-architecture' },
    ],
  },
  solar: {
    beginner: [
      { name: 'PV IV Curve', slug: 'p-v-i-v-curve' },
      { name: 'Bifacial Albedo', slug: 'bifacial-albedo' },
    ],
    intermediate: [
      { name: 'MPPT', slug: 'm-p-p-t' },
      { name: 'Series Parallel PV', slug: 'series-parallel-p-v' },
      { name: 'Solar Temp Coefficient', slug: 'solar-temp-coefficient' },
      { name: 'Solar Yield Prediction', slug: 'solar-yield-prediction' },
    ],
    advanced: [
      { name: 'Passivation Recombination', slug: 'passivation-recombination' },
      { name: 'Cell to Module Losses', slug: 'cell-to-module-losses' },
      { name: 'Spectral Mismatch', slug: 'spectral-mismatch' },
    ],
  },
  elon: {
    beginner: [
      { name: 'ELON Power Plant Picker', slug: 'e-l-o-n_-power-plant-picker' },
      { name: 'ELON Solar Deployment', slug: 'e-l-o-n_-solar-deployment' },
    ],
    intermediate: [
      { name: 'ELON Grid Balance', slug: 'e-l-o-n_-grid-balance' },
      { name: 'ELON Constraint Cascade', slug: 'e-l-o-n_-constraint-cascade' },
      { name: 'ELON Rocket Materials', slug: 'e-l-o-n_-rocket-materials' },
      { name: 'ELON Battery System', slug: 'e-l-o-n_-battery-system' },
    ],
    advanced: [
      { name: 'ELON Fab Yield Curve', slug: 'e-l-o-n_-fab-yield-curve' },
      { name: 'ELON Mining Bottleneck', slug: 'e-l-o-n_-mining-bottleneck' },
      { name: 'ELON Gigawatt Blueprint', slug: 'e-l-o-n_-gigawatt-blueprint' },
      { name: 'ELON Capital Stack', slug: 'e-l-o-n_-capital-stack' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: save learner profile to localStorage
// ─────────────────────────────────────────────────────────────────────────────
function saveLearnerProfileLocal(profile: {
  goals: string[];
  interests: string[];
  level: string;
  completedOnboarding: boolean;
  createdAt: number;
}) {
  // Save via GameProgressService (sets atlas_profile + atlas_onboarding_done)
  saveProfile(profile);
  // Also save to legacy key for backward compat
  try {
    localStorage.setItem('atlas_learner_profile', JSON.stringify(profile));
  } catch {
    // localStorage not available - silently fail
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty badge colors
// ─────────────────────────────────────────────────────────────────────────────
const difficultyColors: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const OnboardingFlow: React.FC = () => {
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [level, setLevel] = useState('intermediate');
  const [transitioning, setTransitioning] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [trackedStart, setTrackedStart] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  let auth: ReturnType<typeof useAuth> | null = null;
  try { auth = useAuth(); } catch { /* fallback */ }

  // Track onboarding start once
  if (!trackedStart) {
    trackOnboardingStarted();
    setTrackedStart(true);
  }

  // Animate step transitions + track step completion
  const goToStep = useCallback((nextStep: number) => {
    const stepNames = ['', 'goals', 'email', 'interests', 'level', 'recommendations'];
    trackOnboardingStepCompleted(step, stepNames[step] || `step_${step}`);
    setTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setTransitioning(false);
    }, 250);
  }, [step]);

  // Toggle multi-select
  const toggleSelection = useCallback((list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  }, []);

  // Build recommendations for step 4
  const recommendations = useMemo(() => {
    const selectedInterests = interests.length > 0 ? interests : Object.keys(categories);
    const results: { name: string; slug: string; category: string; categoryIcon: string; categoryColor: string; difficulty: string }[] = [];
    const seen = new Set<string>();

    for (const cat of selectedInterests) {
      const catGames = recommendedGames[cat];
      if (!catGames) continue;
      const levelGames = catGames[level] || catGames['intermediate'] || [];
      for (const game of levelGames) {
        if (!seen.has(game.slug) && results.length < 8) {
          seen.add(game.slug);
          results.push({
            ...game,
            category: cat,
            categoryIcon: categories[cat]?.icon || '',
            categoryColor: categories[cat]?.color || theme.accent,
            difficulty: level,
          });
        }
      }
      if (results.length >= 8) break;
    }
    return results;
  }, [interests, level]);

  // Save profile, auto-create paths, and navigate
  const completeOnboarding = useCallback((targetUrl: string) => {
    const profileInterests = interests.length > 0 ? interests : Object.keys(categories);
    const profile: Record<string, unknown> = {
      goals,
      interests: profileInterests,
      level,
      completedOnboarding: true,
      createdAt: Date.now(),
    };
    if (email) profile.email = email;
    if (userName) profile.name = userName;
    saveLearnerProfileLocal(profile as { goals: string[]; interests: string[]; level: string; completedOnboarding: boolean; createdAt: number });

    // Track completion
    trackOnboardingCompleted({ goals, interests: profileInterests, level });

    // Auto-generate 1-3 learning paths from best-matching templates
    try {
      import('../src/data/pathTemplates').then(mod => {
        const templates = mod.pathTemplates || mod.default || [];
        if (templates.length === 0) {
          window.location.href = targetUrl;
          return;
        }

        // Score templates by interest + difficulty match
        const scored = templates.map((t: { id: string; title: string; category: string; difficulty: string; gameSequence: string[] }) => {
          let score = 0;
          // Interest match
          if (profileInterests.some((i: string) =>
            t.category.toLowerCase().includes(i.toLowerCase()) ||
            i.toLowerCase().includes(t.category.toLowerCase())
          )) {
            score += 30;
          }
          // Difficulty match (non-overlapping bonuses)
          if (t.difficulty === level) {
            score += 20;
          } else if (
            (level === 'intermediate' && t.difficulty === 'beginner') ||
            (level === 'advanced' && t.difficulty === 'intermediate')
          ) {
            score += 5; // Adjacent difficulty level
          }
          return { template: t, score };
        });

        scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

        // Create top 1-3 paths (at least 1, up to 3 if they score well)
        const topTemplates = scored.slice(0, 3).filter((s: { score: number }) => s.score > 0);
        const toCreate = topTemplates.length > 0 ? topTemplates : scored.slice(0, 1);

        for (const { template } of toCreate) {
          const path = createPathFromTemplate(
            template.id,
            template.title,
            template.gameSequence,
            template.difficulty as 'beginner' | 'intermediate' | 'advanced'
          );
          trackPathEnrolled(path.id, template.id);
        }

        // Redirect to /paths so user sees their personalized curriculum
        window.location.href = '/paths';
      }).catch(() => {
        window.location.href = targetUrl;
      });
    } catch {
      window.location.href = targetUrl;
    }
  }, [goals, interests, level]);

  // ─────────────────────────────────────────────────────────────────────────
  // Progress dots
  // ─────────────────────────────────────────────────────────────────────────
  const ProgressDots = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: i <= step ? theme.accent : theme.border,
              transition: 'background 0.3s ease',
              cursor: i < step ? 'pointer' : 'default',
            }}
            onClick={() => { if (i < step) goToStep(i); }}
          />
        ))}
      </div>
      <span style={{ fontSize: '12px', color: theme.textMuted, fontFamily: theme.fontStack }}>
        Step {step} of 5
      </span>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Primary CTA button
  // ─────────────────────────────────────────────────────────────────────────
  const PrimaryButton = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '14px 36px',
        background: disabled ? theme.border : theme.accent,
        color: disabled ? theme.textMuted : '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 600,
        fontFamily: theme.fontStack,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        transform: hoveredCard === `btn-${label}` && !disabled ? 'scale(1.03)' : 'scale(1)',
      }}
      onMouseEnter={() => setHoveredCard(`btn-${label}`)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Welcome / Goals
  // ─────────────────────────────────────────────────────────────────────────
  const Step1 = () => (
    <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '36px',
        fontWeight: 700,
        color: theme.textPrimary,
        margin: '0 0 12px 0',
        fontFamily: theme.fontStack,
        lineHeight: 1.2,
      }}>
        Welcome to Coach Atlas
      </h1>
      <p style={{
        fontSize: '18px',
        color: theme.textSecondary,
        margin: '0 0 40px 0',
        fontFamily: theme.fontStack,
        lineHeight: 1.5,
      }}>
        340+ interactive simulations to master physics and engineering
      </p>

      <h2 style={{
        fontSize: '20px',
        fontWeight: 600,
        color: theme.textPrimary,
        margin: '0 0 20px 0',
        fontFamily: theme.fontStack,
      }}>
        What brings you here?
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
        marginBottom: '32px',
      }}>
        {goalOptions.map(opt => {
          const selected = goals.includes(opt.id);
          const hovered = hoveredCard === `goal-${opt.id}`;
          return (
            <div
              key={opt.id}
              onClick={() => toggleSelection(goals, setGoals, opt.id)}
              onMouseEnter={() => setHoveredCard(`goal-${opt.id}`)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 20px',
                background: selected ? `${theme.accent}15` : theme.bgCard,
                border: `2px solid ${selected ? theme.accent : hovered ? theme.textMuted : theme.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: hovered ? 'scale(1.02)' : 'scale(1)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '28px', flexShrink: 0 }}>{opt.icon}</span>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: theme.textPrimary,
                  fontFamily: theme.fontStack,
                  marginBottom: '2px',
                }}>
                  {opt.label}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: theme.textSecondary,
                  fontFamily: theme.fontStack,
                  lineHeight: 1.4,
                }}>
                  {opt.description}
                </div>
              </div>
              {selected && (
                <span style={{
                  marginLeft: 'auto',
                  color: theme.accent,
                  fontSize: '20px',
                  flexShrink: 0,
                }}>
                  &#10003;
                </span>
              )}
            </div>
          );
        })}
      </div>

      <PrimaryButton
        label="Continue →"
        onClick={() => goToStep(2)}
        disabled={goals.length === 0}
      />
      <button
        onClick={() => {
          // Quick Start: skip onboarding, create beginner profile + path, jump into first game
          const quickInterests = Object.keys(categories);
          saveLearnerProfileLocal({
            goals: ['curiosity'],
            interests: quickInterests,
            level: 'beginner',
            completedOnboarding: true,
            createdAt: Date.now(),
          });
          trackOnboardingCompleted({ goals: ['curiosity'], interests: quickInterests, level: 'beginner', quickStart: true });
          // Auto-create a beginner path so /paths isn't empty
          try {
            import('../src/data/pathTemplates').then(mod => {
              const templates = mod.pathTemplates || mod.default || [];
              const beginnerTemplate = templates.find((t: { difficulty: string }) => t.difficulty === 'beginner') || templates[0];
              if (beginnerTemplate) {
                const path = createPathFromTemplate(
                  beginnerTemplate.id,
                  beginnerTemplate.title,
                  beginnerTemplate.gameSequence,
                  'beginner'
                );
                trackPathEnrolled(path.id, beginnerTemplate.id);
              }
            }).catch(() => {});
          } catch {}
          window.location.href = '/games/pendulum-period';
        }}
        style={{
          display: 'block',
          margin: '16px auto 0',
          padding: '10px 24px',
          background: 'transparent',
          color: theme.textMuted,
          border: 'none',
          fontSize: '13px',
          fontFamily: theme.fontStack,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Skip setup, jump into a game
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Account Creation (with Firebase Auth)
  // ─────────────────────────────────────────────────────────────────────────
  const handleStep2Submit = async () => {
    if (!email || !email.includes('@')) return;
    if (auth && password.length >= 6) {
      setAuthError('');
      setAuthLoading(true);
      try {
        await auth.signUpWithEmail(email, password, userName || undefined);
        goToStep(3);
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/email-already-in-use') setAuthError('This email already has an account.');
        else if (code === 'auth/weak-password') setAuthError('Password must be at least 6 characters.');
        else setAuthError(err?.message || 'Account creation failed.');
      } finally {
        setAuthLoading(false);
      }
    } else {
      goToStep(3);
    }
  };

  const handleStep2Google = async () => {
    if (!auth) return;
    setAuthError('');
    setAuthLoading(true);
    try {
      await auth.signInWithGoogle();
      goToStep(3);
    } catch (err: any) {
      setAuthError(err?.message || 'Google sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const Step2 = () => {
    // If already authenticated, show confirmation and skip
    if (auth?.isAuthenticated) {
      return (
        <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 10px 0', fontFamily: theme.fontStack }}>
            You're signed in!
          </h1>
          <p style={{ fontSize: '16px', color: theme.textSecondary, margin: '0 0 32px 0', fontFamily: theme.fontStack }}>
            Welcome, {auth.user?.displayName || auth.user?.email}
          </p>
          <PrimaryButton label="Continue →" onClick={() => goToStep(3)} />
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 10px 0', fontFamily: theme.fontStack, lineHeight: 1.2 }}>
          Create Your Account
        </h1>
        <p style={{ fontSize: '16px', color: theme.textSecondary, margin: '0 0 28px 0', fontFamily: theme.fontStack, lineHeight: 1.5 }}>
          Save your progress and get personalized learning tips
        </p>

        <button
          onClick={handleStep2Google}
          disabled={authLoading}
          style={{
            width: '100%', maxWidth: '400px', padding: '13px 16px', background: '#fff', color: '#333',
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, fontFamily: theme.fontStack,
            cursor: authLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px', margin: '0 auto 20px', opacity: authLoading ? 0.7 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px', margin: '0 auto 20px' }}>
          <div style={{ flex: 1, height: '1px', background: theme.border }} />
          <span style={{ fontSize: '12px', color: theme.textMuted, fontFamily: theme.fontStack }}>or with email</span>
          <div style={{ flex: 1, height: '1px', background: theme.border }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '400px', margin: '0 auto 24px', textAlign: 'left' }}>
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your name (optional)"
            style={{ width: '100%', padding: '14px 16px', background: theme.bgCard, border: `2px solid ${theme.border}`, borderRadius: '12px', color: theme.textPrimary, fontSize: '15px', fontFamily: theme.fontStack, outline: 'none', boxSizing: 'border-box' }} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            style={{ width: '100%', padding: '14px 16px', background: theme.bgCard, border: `2px solid ${theme.border}`, borderRadius: '12px', color: theme.textPrimary, fontSize: '15px', fontFamily: theme.fontStack, outline: 'none', boxSizing: 'border-box' }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (6+ characters)"
            style={{ width: '100%', padding: '14px 16px', background: theme.bgCard, border: `2px solid ${theme.border}`, borderRadius: '12px', color: theme.textPrimary, fontSize: '15px', fontFamily: theme.fontStack, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {authError && (
          <p style={{ fontSize: '13px', color: '#ef4444', fontFamily: theme.fontStack, margin: '0 0 14px', textAlign: 'center' }}>{authError}</p>
        )}

        <PrimaryButton
          label={authLoading ? 'Creating account...' : 'Create Account →'}
          onClick={handleStep2Submit}
          disabled={!email || !email.includes('@') || password.length < 6 || authLoading}
        />
        <button
          onClick={() => goToStep(3)}
          style={{ display: 'block', margin: '14px auto 0', padding: '10px 24px', background: 'transparent', color: theme.textMuted, border: 'none', fontSize: '13px', fontFamily: theme.fontStack, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Skip for now
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Interests / Topics
  // ─────────────────────────────────────────────────────────────────────────
  const Step3 = () => (
    <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 700,
        color: theme.textPrimary,
        margin: '0 0 10px 0',
        fontFamily: theme.fontStack,
      }}>
        What topics excite you?
      </h1>
      <p style={{
        fontSize: '16px',
        color: theme.textSecondary,
        margin: '0 0 32px 0',
        fontFamily: theme.fontStack,
      }}>
        We'll prioritize these in your feed
      </p>

      <div
        data-onboarding-grid-topics=""
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {Object.entries(categories).map(([key, cat]) => {
          const selected = interests.includes(key);
          const hovered = hoveredCard === `cat-${key}`;
          return (
            <div
              key={key}
              onClick={() => toggleSelection(interests, setInterests, key)}
              onMouseEnter={() => setHoveredCard(`cat-${key}`)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 12px 16px',
                background: selected ? `${cat.color}12` : theme.bgCard,
                border: `2px solid ${selected ? cat.color : hovered ? theme.textMuted : theme.border}`,
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: hovered ? 'scale(1.03)' : 'scale(1)',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '32px', marginBottom: '8px' }}>{cat.icon}</span>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: selected ? cat.color : theme.textPrimary,
                fontFamily: theme.fontStack,
                marginBottom: '4px',
              }}>
                {cat.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: theme.textSecondary,
                fontFamily: theme.fontStack,
                lineHeight: 1.3,
                marginBottom: '8px',
                textAlign: 'center',
              }}>
                {cat.description}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: selected ? cat.color : theme.textMuted,
                background: selected ? `${cat.color}20` : `${theme.border}`,
                padding: '2px 10px',
                borderRadius: '20px',
                fontFamily: theme.fontStack,
              }}>
                {cat.count} games
              </span>
              {selected && (
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '10px',
                  color: cat.color,
                  fontSize: '16px',
                  fontWeight: 700,
                }}>
                  &#10003;
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
        <button
          onClick={() => {
            setInterests(Object.keys(categories));
            goToStep(4);
          }}
          style={{
            padding: '12px 28px',
            background: 'transparent',
            color: theme.textSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: theme.fontStack,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Skip
        </button>
        <PrimaryButton
          label="Continue →"
          onClick={() => goToStep(4)}
          disabled={interests.length === 0}
        />
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Level
  // ─────────────────────────────────────────────────────────────────────────
  const Step4 = () => (
    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 700,
        color: theme.textPrimary,
        margin: '0 0 10px 0',
        fontFamily: theme.fontStack,
      }}>
        What's your experience level?
      </h1>
      <p style={{
        fontSize: '16px',
        color: theme.textSecondary,
        margin: '0 0 32px 0',
        fontFamily: theme.fontStack,
      }}>
        We'll match game difficulty to your level
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
        {levelOptions.map(opt => {
          const selected = level === opt.id;
          const hovered = hoveredCard === `level-${opt.id}`;
          return (
            <div
              key={opt.id}
              onClick={() => setLevel(opt.id)}
              onMouseEnter={() => setHoveredCard(`level-${opt.id}`)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                padding: '24px',
                background: selected ? `${opt.color}12` : theme.bgCard,
                border: `2px solid ${selected ? opt.color : hovered ? theme.textMuted : theme.border}`,
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: hovered ? 'scale(1.02)' : 'scale(1)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '36px', flexShrink: 0 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: selected ? opt.color : theme.textPrimary,
                  fontFamily: theme.fontStack,
                  marginBottom: '4px',
                }}>
                  {opt.label}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: theme.textSecondary,
                  fontFamily: theme.fontStack,
                  lineHeight: 1.5,
                }}>
                  {opt.description}
                </div>
              </div>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: `2px solid ${selected ? opt.color : theme.border}`,
                background: selected ? opt.color : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}>
                {selected && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ffffff',
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PrimaryButton
        label="See My Path →"
        onClick={() => goToStep(5)}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Recommendations
  // ─────────────────────────────────────────────────────────────────────────
  const Step5 = () => (
    <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 700,
        color: theme.textPrimary,
        margin: '0 0 10px 0',
        fontFamily: theme.fontStack,
      }}>
        Your personalized learning path
      </h1>
      <p style={{
        fontSize: '16px',
        color: theme.textSecondary,
        margin: '0 0 32px 0',
        fontFamily: theme.fontStack,
      }}>
        Based on your interests and level, here are great starting points
      </p>

      <div
        data-onboarding-grid-recs=""
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {recommendations.map(game => {
          const hovered = hoveredCard === `rec-${game.slug}`;
          return (
            <div
              key={game.slug}
              onClick={() => completeOnboarding(`/games/${game.slug}`)}
              onMouseEnter={() => setHoveredCard(`rec-${game.slug}`)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                background: theme.bgCard,
                border: `2px solid ${hovered ? game.categoryColor : theme.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: hovered ? 'scale(1.03)' : 'scale(1)',
                textAlign: 'left',
              }}
            >
              <span style={{
                fontSize: '28px',
                flexShrink: 0,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${game.categoryColor}18`,
                borderRadius: '10px',
              }}>
                {game.categoryIcon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: theme.textPrimary,
                  fontFamily: theme.fontStack,
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {game.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    color: theme.textMuted,
                    fontFamily: theme.fontStack,
                  }}>
                    {categories[game.category]?.name}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: difficultyColors[game.difficulty] || theme.textMuted,
                    background: `${difficultyColors[game.difficulty] || theme.border}20`,
                    padding: '1px 8px',
                    borderRadius: '20px',
                    fontFamily: theme.fontStack,
                    textTransform: 'capitalize',
                  }}>
                    {game.difficulty}
                  </span>
                </div>
              </div>
              <span style={{
                color: theme.textMuted,
                fontSize: '18px',
                flexShrink: 0,
                transition: 'color 0.2s',
                ...(hovered ? { color: game.categoryColor } : {}),
              }}>
                &#8250;
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <PrimaryButton
          label="Start My Paths →"
          onClick={() => completeOnboarding('/paths')}
        />
        <button
          onClick={() => {
            setGoals([]);
            setInterests([]);
            setLevel('intermediate');
            goToStep(1);
          }}
          style={{
            padding: '10px 24px',
            background: 'transparent',
            color: theme.textSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: theme.fontStack,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Retake Setup
        </button>
        <p style={{
          fontSize: '12px',
          color: theme.textMuted,
          fontFamily: theme.fontStack,
          marginTop: '8px',
        }}>
          Your preferences are saved locally. No account needed.
        </p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: theme.fontStack,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background gradient */}
      <div style={{
        position: 'absolute',
        top: '-200px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: `radial-gradient(circle, ${theme.accent}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '800px',
        position: 'relative',
        zIndex: 1,
      }}>
        <ProgressDots />

        {/* Step content with fade transition */}
        <div style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
          {step === 5 && <Step5 />}
        </div>
      </div>

      {/* Responsive style overrides via inline media query workaround */}
      <style>{`
        @media (max-width: 640px) {
          [data-onboarding-grid-topics] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          [data-onboarding-grid-recs] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          [data-onboarding-grid-topics] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OnboardingFlow;
