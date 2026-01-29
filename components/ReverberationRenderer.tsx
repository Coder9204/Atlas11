import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ReverberationRendererProps {
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
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  soundWave: '#3b82f6',
  absorbed: '#10b981',
  reflected: '#ef4444',
  wall: '#64748b',
};

interface SoundRay {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  bounces: number;
  trail: { x: number; y: number }[];
}

interface RoomConfig {
  name: string;
  width: number;
  height: number;
  volume: number;
  surfaces: {
    name: string;
    area: number;
    absorption: number;
    color: string;
  }[];
  description: string;
}

const roomTypes: Record<string, RoomConfig> = {
  bathroom: {
    name: 'Bathroom',
    width: 300,
    height: 200,
    volume: 15,
    surfaces: [
      { name: 'Tile Walls', area: 30, absorption: 0.01, color: '#94a3b8' },
      { name: 'Tile Floor', area: 6, absorption: 0.01, color: '#64748b' },
      { name: 'Glass/Mirror', area: 4, absorption: 0.02, color: '#a5b4fc' },
      { name: 'Ceiling', area: 6, absorption: 0.02, color: '#cbd5e1' },
    ],
    description: 'Hard, reflective surfaces everywhere',
  },
  bedroom: {
    name: 'Bedroom',
    width: 300,
    height: 200,
    volume: 40,
    surfaces: [
      { name: 'Drywall', area: 40, absorption: 0.05, color: '#e2e8f0' },
      { name: 'Carpet', area: 15, absorption: 0.30, color: '#7c3aed' },
      { name: 'Bed/Furniture', area: 8, absorption: 0.40, color: '#c084fc' },
      { name: 'Curtains', area: 6, absorption: 0.50, color: '#a78bfa' },
    ],
    description: 'Soft furnishings absorb sound',
  },
  concertHall: {
    name: 'Concert Hall',
    width: 350,
    height: 220,
    volume: 15000,
    surfaces: [
      { name: 'Wood Panels', area: 800, absorption: 0.10, color: '#d97706' },
      { name: 'Audience', area: 400, absorption: 0.80, color: '#f59e0b' },
      { name: 'Ceiling', area: 600, absorption: 0.05, color: '#fbbf24' },
      { name: 'Stage', area: 200, absorption: 0.15, color: '#b45309' },
    ],
    description: 'Designed for optimal RT60 of 1.5-2.5s',
  },
  studio: {
    name: 'Recording Studio',
    width: 300,
    height: 180,
    volume: 80,
    surfaces: [
      { name: 'Acoustic Foam', area: 30, absorption: 0.70, color: '#1e293b' },
      { name: 'Bass Traps', area: 8, absorption: 0.90, color: '#334155' },
      { name: 'Diffusers', area: 10, absorption: 0.40, color: '#475569' },
      { name: 'Carpet', area: 12, absorption: 0.30, color: '#4b5563' },
    ],
    description: 'Heavily treated for minimal reverb',
  },
};

const ReverberationRenderer: React.FC<ReverberationRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [selectedRoom, setSelectedRoom] = useState<string>('bathroom');
  const [rays, setRays] = useState<SoundRay[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [energyHistory, setEnergyHistory] = useState<number[]>([100]);
  const [hasFurnishings, setHasFurnishings] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const room = roomTypes[selectedRoom];

  // Calculate RT60 using Sabine equation
  const calculateRT60 = useCallback((roomKey: string, withFurnishings: boolean = false) => {
    const r = roomTypes[roomKey];
    let totalAbsorption = r.surfaces.reduce((sum, s) => sum + s.area * s.absorption, 0);

    if (withFurnishings && (roomKey === 'bathroom' || roomKey === 'concertHall')) {
      // Adding blankets/pillows increases absorption significantly
      totalAbsorption += 5 * 0.5; // 5 m^2 of soft materials with 0.5 absorption
    }

    // Sabine equation: RT60 = 0.161 * V / A
    const rt60 = (0.161 * r.volume) / totalAbsorption;
    return Math.min(rt60, 10); // Cap at 10 seconds for display
  }, []);

  // Initialize rays
  const initializeRays = useCallback(() => {
    const newRays: SoundRay[] = [];
    const centerX = room.width / 2;
    const centerY = room.height / 2;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 3;
      newRays.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        energy: 100,
        bounces: 0,
        trail: [{ x: centerX, y: centerY }],
      });
    }
    return newRays;
  }, [room]);

  // Get effective absorption for current room
  const getEffectiveAbsorption = useCallback(() => {
    let avgAbsorption = room.surfaces.reduce((sum, s) => sum + s.absorption, 0) / room.surfaces.length;
    if (hasFurnishings && (selectedRoom === 'bathroom' || selectedRoom === 'concertHall')) {
      avgAbsorption += 0.15;
    }
    return Math.min(avgAbsorption, 0.95);
  }, [room, hasFurnishings, selectedRoom]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const absorption = getEffectiveAbsorption();

    const animate = () => {
      setRays(prevRays => {
        const newRays = prevRays.map(ray => {
          if (ray.energy < 1) return ray;

          let newX = ray.x + ray.vx;
          let newY = ray.y + ray.vy;
          let newVx = ray.vx;
          let newVy = ray.vy;
          let newEnergy = ray.energy;
          let newBounces = ray.bounces;

          // Wall collisions
          const padding = 20;
          if (newX < padding || newX > room.width - padding) {
            newVx = -newVx;
            newEnergy *= (1 - absorption);
            newBounces++;
            newX = Math.max(padding, Math.min(room.width - padding, newX));
          }
          if (newY < padding || newY > room.height - padding) {
            newVy = -newVy;
            newEnergy *= (1 - absorption);
            newBounces++;
            newY = Math.max(padding, Math.min(room.height - padding, newY));
          }

          const newTrail = [...ray.trail, { x: newX, y: newY }].slice(-30);

          return {
            ...ray,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            energy: newEnergy,
            bounces: newBounces,
            trail: newTrail,
          };
        });

        return newRays;
      });

      setTime(prev => prev + 0.05);
      setEnergyHistory(prev => {
        const avgEnergy = rays.reduce((sum, r) => sum + r.energy, 0) / Math.max(rays.length, 1);
        const newHistory = [...prev, avgEnergy].slice(-100);
        return newHistory;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, room, rays, getEffectiveAbsorption]);

  const startSimulation = () => {
    setRays(initializeRays());
    setTime(0);
    setEnergyHistory([100]);
    setIsPlaying(true);
  };

  const stopSimulation = () => {
    setIsPlaying(false);
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setRays([]);
    setTime(0);
    setEnergyHistory([100]);
  };

  const predictions = [
    { id: 'bathroom', label: 'The bathroom rings longer (more echo)' },
    { id: 'bedroom', label: 'The bedroom rings longer (more echo)' },
    { id: 'same', label: 'They sound exactly the same' },
    { id: 'neither', label: 'Neither room has any reverb' },
  ];

  const twistPredictions = [
    { id: 'increase', label: 'Reverb time increases (more echo)' },
    { id: 'decrease', label: 'Reverb time decreases (less echo)' },
    { id: 'same', label: 'Reverb time stays the same' },
    { id: 'frequency', label: 'Only high frequencies are affected' },
  ];

  const transferApplications = [
    {
      title: 'Concert Hall Design',
      description: 'Concert halls are carefully designed with RT60 of 1.5-2.5 seconds for orchestral music. Variable acoustics (curtains, panels) allow adjustment for different performances.',
      question: 'Why do concert halls need longer reverb than recording studios?',
      answer: 'Live music benefits from natural blending and "warmth" that reverb provides. It helps instruments blend together and creates the sense of a large, enveloping space. Studios need dry sound for post-processing control.',
    },
    {
      title: 'Recording Studios',
      description: 'Professional studios aim for RT60 under 0.3 seconds using acoustic foam, bass traps, and diffusers. This allows clean recording with reverb added digitally later.',
      question: 'Why do studios use both absorption AND diffusion?',
      answer: 'Pure absorption can make rooms sound "dead" and unnatural. Diffusers scatter sound without absorbing it, maintaining some ambience while preventing distinct echoes and flutter.',
    },
    {
      title: 'Speech Intelligibility',
      description: 'Classrooms and lecture halls need RT60 of 0.4-0.6 seconds. Too much reverb causes words to overlap and blur; too little sounds unnatural and straining.',
      question: 'Why is reverb control critical for hearing-impaired listeners?',
      answer: 'Hearing aids amplify all sound including reverb. Excessive reverb makes speech muddy and hard to distinguish. Optimal acoustics dramatically improve comprehension for all listeners.',
    },
    {
      title: 'Home Theater',
      description: 'Home theaters balance immersion with clarity, targeting RT60 of 0.3-0.5 seconds. Strategic placement of absorbers and diffusers creates cinema-like experience.',
      question: 'How do room dimensions affect home theater acoustics?',
      answer: 'Parallel walls create flutter echoes; non-parallel surfaces or treatment prevent this. Room modes (standing waves) at specific frequencies cause bass problems. Treatment placement must address both reverb and modes.',
    },
  ];

  const testQuestions = [
    {
      question: 'What does RT60 measure?',
      options: [
        { text: 'Time for sound to drop 60 decibels', correct: true },
        { text: 'Time for sound to travel 60 meters', correct: false },
        { text: 'Frequency response at 60 Hz', correct: false },
        { text: 'Sound pressure level at 60 feet', correct: false },
      ],
    },
    {
      question: 'According to the Sabine equation, reverb time increases when:',
      options: [
        { text: 'Room volume increases', correct: true },
        { text: 'Absorption increases', correct: false },
        { text: 'Temperature increases', correct: false },
        { text: 'Sound frequency increases', correct: false },
      ],
    },
    {
      question: 'Why does a bathroom have longer reverb than a bedroom?',
      options: [
        { text: 'Bathrooms are smaller', correct: false },
        { text: 'Hard tile surfaces reflect rather than absorb', correct: true },
        { text: 'Water vapor increases echo', correct: false },
        { text: 'Bedrooms have more windows', correct: false },
      ],
    },
    {
      question: 'The absorption coefficient ranges from:',
      options: [
        { text: '0 (perfect reflector) to 1 (perfect absorber)', correct: true },
        { text: '-1 to +1', correct: false },
        { text: '1 to 100', correct: false },
        { text: '0 to 60 dB', correct: false },
      ],
    },
    {
      question: 'Adding soft furnishings to a room will:',
      options: [
        { text: 'Increase reverb time', correct: false },
        { text: 'Decrease reverb time', correct: true },
        { text: 'Not affect reverb time', correct: false },
        { text: 'Only affect high frequencies', correct: false },
      ],
    },
    {
      question: 'For speech intelligibility, the ideal RT60 is approximately:',
      options: [
        { text: '0.0 seconds (anechoic)', correct: false },
        { text: '0.4-0.6 seconds', correct: true },
        { text: '2.0-3.0 seconds', correct: false },
        { text: '5.0+ seconds', correct: false },
      ],
    },
    {
      question: 'Concert halls are designed with longer RT60 because:',
      options: [
        { text: 'Musicians prefer echo for timing', correct: false },
        { text: 'Reverb helps blend instruments and creates warmth', correct: true },
        { text: 'Building codes require it', correct: false },
        { text: 'Sound travels slower in large spaces', correct: false },
      ],
    },
    {
      question: 'Recording studios use acoustic treatment to:',
      options: [
        { text: 'Make the room louder', correct: false },
        { text: 'Reduce reverb for clean, controllable recordings', correct: true },
        { text: 'Increase bass response', correct: false },
        { text: 'Block outside noise only', correct: false },
      ],
    },
    {
      question: 'The Sabine equation is: RT60 = 0.161 x V / A. What is A?',
      options: [
        { text: 'Room area in square meters', correct: false },
        { text: 'Total absorption (sum of surface area times absorption coefficient)', correct: true },
        { text: 'Air absorption coefficient', correct: false },
        { text: 'Amplitude of sound wave', correct: false },
      ],
    },
    {
      question: 'Why do empty rooms sound "echoey"?',
      options: [
        { text: 'Empty rooms are colder', correct: false },
        { text: 'Without furniture to absorb sound, more energy reflects', correct: true },
        { text: 'Air molecules echo more without obstacles', correct: false },
        { text: 'The ear perceives emptiness as echo', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderRoomVisualization = (interactive: boolean) => {
    const width = room.width;
    const height = room.height;
    const rt60 = calculateRT60(selectedRoom, hasFurnishings);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height + 60}
          viewBox={`0 0 ${width} ${height + 60}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '400px' }}
        >
          {/* Room outline */}
          <rect
            x={15}
            y={15}
            width={width - 30}
            height={height - 30}
            fill="#0f172a"
            stroke={colors.wall}
            strokeWidth={3}
          />

          {/* Surface indicators on walls */}
          {room.surfaces.map((surface, i) => {
            const positions = [
              { x: 15, y: 15 + (height - 30) * 0.25 * i, w: 8, h: (height - 30) * 0.2 },
              { x: width - 23, y: 15 + (height - 30) * 0.25 * i, w: 8, h: (height - 30) * 0.2 },
              { x: 15 + (width - 30) * 0.25 * i, y: 15, w: (width - 30) * 0.2, h: 8 },
              { x: 15 + (width - 30) * 0.25 * i, y: height - 23, w: (width - 30) * 0.2, h: 8 },
            ];
            const pos = positions[i % 4];
            return (
              <rect
                key={i}
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                fill={surface.color}
                opacity={0.8}
              />
            );
          })}

          {/* Furnishings if enabled */}
          {hasFurnishings && (selectedRoom === 'bathroom' || selectedRoom === 'concertHall') && (
            <>
              <rect
                x={width / 2 - 30}
                y={height / 2}
                width={60}
                height={40}
                fill="#a78bfa"
                rx={5}
                opacity={0.8}
              />
              <text
                x={width / 2}
                y={height / 2 + 25}
                fill={colors.textPrimary}
                fontSize={10}
                textAnchor="middle"
              >
                Blankets
              </text>
            </>
          )}

          {/* Sound source indicator */}
          <circle
            cx={width / 2}
            cy={height / 2 - 20}
            r={8}
            fill={colors.soundWave}
            opacity={0.9}
          />
          <text
            x={width / 2}
            y={height / 2 - 35}
            fill={colors.textSecondary}
            fontSize={10}
            textAnchor="middle"
          >
            Sound Source
          </text>

          {/* Sound rays */}
          {rays.map(ray => (
            <g key={ray.id}>
              {/* Trail */}
              {ray.trail.length > 1 && (
                <polyline
                  points={ray.trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={colors.soundWave}
                  strokeWidth={2}
                  opacity={ray.energy / 100 * 0.6}
                />
              )}
              {/* Ray head */}
              <circle
                cx={ray.x}
                cy={ray.y}
                r={4}
                fill={ray.energy > 50 ? colors.reflected : colors.absorbed}
                opacity={Math.max(ray.energy / 100, 0.2)}
              />
            </g>
          ))}

          {/* Energy decay graph area */}
          <rect
            x={15}
            y={height + 5}
            width={width - 30}
            height={50}
            fill="rgba(0,0,0,0.3)"
            rx={4}
          />

          {/* Energy decay curve */}
          {energyHistory.length > 1 && (
            <polyline
              points={energyHistory.map((e, i) =>
                `${15 + (i / 100) * (width - 30)},${height + 5 + 50 - (e / 100) * 45}`
              ).join(' ')}
              fill="none"
              stroke={colors.success}
              strokeWidth={2}
            />
          )}

          {/* 60dB line (RT60 threshold) */}
          <line
            x1={15}
            y1={height + 5 + 50 - (0.1) * 45}
            x2={width - 15}
            y2={height + 5 + 50 - (0.1) * 45}
            stroke={colors.warning}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <text
            x={width - 20}
            y={height + 50}
            fill={colors.warning}
            fontSize={8}
            textAnchor="end"
          >
            -60dB
          </text>

          {/* Labels */}
          <text x={20} y={height + 20} fill={colors.textMuted} fontSize={9}>
            Energy Decay
          </text>
        </svg>

        {/* RT60 Display */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.2)',
          padding: '12px 20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Calculated RT60:
          </div>
          <div style={{ color: colors.accent, fontSize: '24px', fontWeight: 'bold' }}>
            {rt60.toFixed(2)} seconds
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={isPlaying ? stopSimulation : startSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isPlaying ? 'Stop' : 'Play Sound'}
            </button>
            <button
              onClick={resetSimulation}
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

  const renderRoomSelector = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ color: colors.textSecondary, fontSize: '14px' }}>
        Select Room Type:
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(roomTypes).map(([key, r]) => (
          <button
            key={key}
            onClick={() => {
              setSelectedRoom(key);
              resetSimulation();
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: selectedRoom === key ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: selectedRoom === key ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Surface absorption display */}
      <div style={{
        background: colors.bgCard,
        padding: '12px',
        borderRadius: '8px',
        marginTop: '8px',
      }}>
        <h4 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
          Surface Materials:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {room.surfaces.map((surface, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: surface.color,
              }} />
              <span style={{ color: colors.textSecondary, fontSize: '12px', flex: 1 }}>
                {surface.name}
              </span>
              <span style={{
                color: surface.absorption > 0.3 ? colors.success : colors.error,
                fontSize: '11px',
                fontWeight: 'bold',
              }}>
                {(surface.absorption * 100).toFixed(0)}% abs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Rooms Sound Different
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Which room "rings" longer: bathroom or bedroom?
            </p>
          </div>

          {renderRoomVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Clap your hands in a bathroom, then in a carpeted bedroom.
                One space has a noticeable "ring" that lingers - the other
                sounds almost "dead". What causes this dramatic difference?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is reverberation - and understanding it is key to acoustic design.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Play Sound" to visualize how sound energy bounces and decays!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderRoomVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A cross-section of a room with a sound source in the center.
              Sound rays travel outward and bounce off walls. The graph below
              shows how sound energy decays over time. RT60 is the time for
              sound to drop by 60 decibels (to 1/1,000,000th of original).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which room will have the LONGER reverberation time?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Reverberation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare how different rooms affect sound decay
            </p>
          </div>

          {renderRoomVisualization(true)}
          {renderRoomSelector()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Compare bathroom (tile) vs bedroom (carpet)</li>
              <li>Notice how concert halls balance reverb</li>
              <li>See how studio treatment kills reverb</li>
              <li>Watch the energy decay curve change</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'bathroom';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The bathroom rings longer because hard tile surfaces reflect sound instead of absorbing it!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Reverberation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>RT60 - Reverberation Time:</strong> The time
                for sound to decay by 60 dB (to one millionth of its original intensity). This is the
                standard measure of how "live" or "dead" a room sounds.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sabine Equation:</strong> RT60 = 0.161 x V / A
                where V is room volume and A is total absorption. More absorption = shorter reverb.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Absorption Coefficient:</strong> Ranges from
                0 (perfect reflector, like tile) to 1 (perfect absorber, like acoustic foam). Soft
                materials absorb; hard materials reflect.
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.soundWave}`,
          }}>
            <h4 style={{ color: colors.soundWave, marginBottom: '8px' }}>Typical RT60 Values:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
              <li>Recording studio: 0.2-0.4 seconds</li>
              <li>Living room: 0.4-0.6 seconds</li>
              <li>Classroom: 0.6-0.8 seconds</li>
              <li>Concert hall: 1.5-2.5 seconds</li>
              <li>Cathedral: 4-8 seconds</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you add blankets and pillows to the bathroom?
            </p>
          </div>

          {renderRoomVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine placing a stack of thick blankets and pillows in the bathroom.
              These soft materials have high absorption coefficients (around 0.5).
              The tile walls remain the same.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the bathroom's reverb time when you add soft furnishings?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Adding Soft Furnishings</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle furnishings and observe the RT60 change
            </p>
          </div>

          {renderRoomVisualization(true)}

          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setHasFurnishings(!hasFurnishings);
                resetSimulation();
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '8px',
                border: hasFurnishings ? `2px solid ${colors.success}` : `2px solid ${colors.warning}`,
                background: hasFurnishings ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {hasFurnishings ? 'Remove Blankets/Pillows' : 'Add Blankets/Pillows'}
            </button>
          </div>

          {renderRoomSelector()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch how RT60 drops when you add soft materials. Even a small amount of
              absorption can significantly reduce reverb time. This is why hotels put
              carpet and curtains in echoey spaces!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'decrease';
    const rt60Without = calculateRT60('bathroom', false);
    const rt60With = calculateRT60('bathroom', true);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Adding soft furnishings decreases reverb time by increasing total absorption!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Math Behind It</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sabine Equation:</strong> RT60 = 0.161 x V / A
              </p>
              <p style={{ marginBottom: '12px' }}>
                Adding blankets increases A (total absorption) without changing V (volume).
                Since A is in the denominator, increasing it decreases RT60.
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.2)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
              }}>
                <p style={{ color: colors.textPrimary, marginBottom: '4px' }}>
                  Bathroom without blankets: RT60 = {rt60Without.toFixed(2)}s
                </p>
                <p style={{ color: colors.success }}>
                  Bathroom with blankets: RT60 = {rt60With.toFixed(2)}s
                </p>
                <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                  Reduction: {((1 - rt60With/rt60Without) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Real-World Application:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This is exactly how acoustic treatment works! Recording studios use foam panels,
              bass traps, and diffusers to control reverb. Even hanging thick curtains or
              adding a rug can noticeably improve room acoustics.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Reverberation control in architecture and audio engineering
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
                {testScore >= 8 ? 'You\'ve mastered reverberation!' : 'Review the material and try again.'}
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
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered reverberation and room acoustics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>RT60 measures reverb decay time (60 dB drop)</li>
              <li>Sabine equation: RT60 = 0.161 x V / A</li>
              <li>Absorption coefficients of different materials</li>
              <li>How soft furnishings reduce reverb</li>
              <li>Optimal RT60 for different spaces</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Real acoustic design considers frequency-dependent absorption (bass traps for low frequencies),
              early reflections vs late reverb, diffusion vs absorption, and room modes. Modern concert halls
              use computer modeling and adjustable acoustic elements for precise control. The Sabine equation
              is just the beginning - Eyring and other equations handle high-absorption rooms better!
            </p>
          </div>
          {renderRoomVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ReverberationRenderer;
