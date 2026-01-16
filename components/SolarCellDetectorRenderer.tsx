'use client';

import React, { useState, useRef, useEffect } from 'react';
import { playSound } from '../lib/audio';

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

interface SavedState {
  phase: Phase;
  completedApps: number[];
  testAnswers: number[];
  testScore: number | null;
}

interface GameEvent {
  type: 'state_update' | 'completion' | 'tool_call';
  phase: Phase;
  data: Record<string, unknown>;
}

interface SolarCellDetectorRendererProps {
  onStateChange?: (state: SavedState) => void;
  onEvent?: (event: GameEvent) => void;
  savedState?: SavedState | null;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function SolarCellDetectorRenderer({
  onStateChange,
  onEvent,
  savedState,
}: SolarCellDetectorRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [testAnswers, setTestAnswers] = useState<number[]>(
    savedState?.testAnswers || [-1, -1, -1]
  );
  const [testScore, setTestScore] = useState<number | null>(
    savedState?.testScore ?? null
  );

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase: Solar cell light meter
  const [lightIntensity, setLightIntensity] = useState(50);
  const [cellAngle, setCellAngle] = useState(0);
  const [wavelength, setWavelength] = useState<'visible' | 'infrared' | 'uv'>('visible');
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase: Camera sensor
  const [showingPixel, setShowingPixel] = useState<number | null>(null);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  const navigationLockRef = useRef(false);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const state: SavedState = {
      phase,
      completedApps: Array.from(completedApps),
      testAnswers,
      testScore,
    };
    onStateChange?.(state);
  }, [phase, completedApps, testAnswers, testScore, onStateChange]);

  useEffect(() => {
    const event: GameEvent = {
      type: phase === 'mastery' ? 'completion' : 'state_update',
      phase,
      data: { testScore },
    };
    onEvent?.(event);
  }, [phase, testScore, onEvent]);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHYSICS CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getAngleEfficiency = () => {
    // Cosine law for light intensity at angle
    return Math.cos((cellAngle * Math.PI) / 180);
  };

  const getWavelengthEfficiency = () => {
    // Silicon solar cells have different sensitivity to wavelengths
    switch (wavelength) {
      case 'visible': return 0.85;
      case 'infrared': return 0.5; // Less efficient at IR
      case 'uv': return 0.3; // UV mostly absorbed at surface
      default: return 0.85;
    }
  };

  const getOutputCurrent = () => {
    const baseOutput = lightIntensity / 100;
    return baseOutput * getAngleEfficiency() * getWavelengthEfficiency();
  };

  const getOutputVoltage = () => {
    // Open-circuit voltage is more logarithmic with intensity
    const current = getOutputCurrent();
    if (current <= 0) return 0;
    return 0.45 + 0.1 * Math.log10(current * 100 + 1);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = (choice: string) => {
    playSound('click');
    setPrediction(choice);
    setShowPredictionFeedback(true);
  };

  const handleTwistPrediction = (choice: string) => {
    playSound('click');
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  };

  const handleExperiment = () => {
    setExperimentCount(prev => prev + 1);
    if (experimentCount >= 2) {
      setHasExperimented(true);
    }
  };

  const handleCompleteApp = (appIndex: number) => {
    playSound('success');
    setCompletedApps(prev => new Set([...prev, appIndex]));
  };

  const handleTestAnswer = (questionIndex: number, answerIndex: number) => {
    playSound('click');
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
  };

  const handleSubmitTest = () => {
    const correctAnswers = [1, 2, 0]; // Correct indices
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === correctAnswers[index]) score++;
    });
    setTestScore(score);
    playSound(score >= 2 ? 'success' : 'failure');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderPhaseIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-2 rounded-full transition-all duration-300 ${
              i <= PHASES.indexOf(phase)
                ? 'bg-amber-500 w-6'
                : 'bg-gray-200 w-4'
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-gray-500 font-medium">
        {PHASES.indexOf(phase) + 1} / {PHASES.length}
      </span>
    </div>
  );

  const renderSolarCellSimulator = () => {
    const current = getOutputCurrent();
    const voltage = getOutputVoltage();

    return (
      <svg viewBox="0 0 400 220" className="w-full h-52 mb-4">
        {/* Light source */}
        <circle cx="60" cy="50" r="35" fill="#FEF08A" stroke="#F59E0B" strokeWidth="3" />
        <text x="60" y="55" textAnchor="middle" fill="#92400E" fontSize="11" fontWeight="bold">
          ☀️
        </text>

        {/* Light rays */}
        {[0, 1, 2, 3, 4].map(i => {
          const angle = (i - 2) * 15;
          const startX = 95;
          const startY = 50 + (i - 2) * 10;
          const endX = 160;
          const endY = 90 + (i - 2) * 5;
          return (
            <line
              key={i}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={wavelength === 'visible' ? '#FCD34D' : wavelength === 'infrared' ? '#F87171' : '#A78BFA'}
              strokeWidth="2"
              opacity={lightIntensity / 100}
            >
              <animate
                attributeName="opacity"
                values={`${lightIntensity / 100 * 0.5};${lightIntensity / 100};${lightIntensity / 100 * 0.5}`}
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          );
        })}

        {/* Light intensity label */}
        <text x="60" y="100" textAnchor="middle" fill="#6B7280" fontSize="10">
          {lightIntensity}% intensity
        </text>

        {/* Solar cell (rotatable) */}
        <g transform={`translate(200, 100) rotate(${cellAngle})`}>
          <rect x="-40" y="-50" width="80" height="100" fill="#1E3A5F" rx="4" />
          {/* Grid lines */}
          {[-35, -15, 5, 25].map(y => (
            <line key={y} x1="-35" y1={y} x2="35" y2={y} stroke="#374151" strokeWidth="1" />
          ))}
          {[-25, 0, 25].map(x => (
            <line key={x} x1={x} y1="-45" x2={x} y2="45" stroke="#374151" strokeWidth="1" />
          ))}
          {/* Highlight active area based on angle */}
          <rect
            x="-38"
            y="-48"
            width={76 * Math.max(0, getAngleEfficiency())}
            height="96"
            fill="#3B82F6"
            opacity="0.3"
          />
        </g>

        {/* Angle indicator */}
        <text x="200" y="170" textAnchor="middle" fill="#6B7280" fontSize="10">
          Angle: {cellAngle}°
        </text>

        {/* Output display */}
        <g transform="translate(290, 40)">
          <rect width="100" height="130" fill="#F3F4F6" rx="8" />
          <text x="50" y="20" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="bold">
            OUTPUT
          </text>

          {/* Current meter */}
          <rect x="10" y="30" width="80" height="40" fill="#DBEAFE" rx="4" />
          <text x="50" y="45" textAnchor="middle" fill="#1E40AF" fontSize="9">
            CURRENT
          </text>
          <text x="50" y="62" textAnchor="middle" fill="#1D4ED8" fontSize="14" fontWeight="bold">
            {(current * 100).toFixed(1)} mA
          </text>

          {/* Voltage meter */}
          <rect x="10" y="80" width="80" height="40" fill="#FEF3C7" rx="4" />
          <text x="50" y="95" textAnchor="middle" fill="#92400E" fontSize="9">
            VOLTAGE
          </text>
          <text x="50" y="112" textAnchor="middle" fill="#B45309" fontSize="14" fontWeight="bold">
            {voltage.toFixed(2)} V
          </text>
        </g>

        {/* Wavelength indicator */}
        <rect
          x="20"
          y="130"
          width="60"
          height="25"
          fill={wavelength === 'visible' ? '#FEF08A' : wavelength === 'infrared' ? '#FEE2E2' : '#EDE9FE'}
          rx="4"
        />
        <text
          x="50"
          y="147"
          textAnchor="middle"
          fill={wavelength === 'visible' ? '#92400E' : wavelength === 'infrared' ? '#991B1B' : '#5B21B6'}
          fontSize="10"
        >
          {wavelength === 'visible' ? 'Visible' : wavelength === 'infrared' ? 'IR' : 'UV'}
        </text>
      </svg>
    );
  };

  const renderCameraSensor = () => {
    // Simulated 8x8 pixel array
    const pixelValues = Array.from({ length: 64 }, (_, i) => {
      const row = Math.floor(i / 8);
      const col = i % 8;
      // Create a simple gradient/pattern
      const brightness = Math.sin((row + col) * 0.5) * 0.3 + 0.5;
      return Math.floor(brightness * 255);
    });

    return (
      <svg viewBox="0 0 400 200" className="w-full h-48 mb-4">
        {/* Scene (light source) */}
        <g transform="translate(20, 30)">
          <rect width="100" height="120" fill="#E5E7EB" rx="8" />
          <circle cx="50" cy="40" r="25" fill="#FEF08A" />
          <rect x="30" y="80" width="40" height="30" fill="#3B82F6" />
          <text x="50" y="160" textAnchor="middle" fill="#6B7280" fontSize="10">
            Scene
          </text>
        </g>

        {/* Lens */}
        <ellipse cx="160" cy="90" rx="15" ry="40" fill="none" stroke="#6366F1" strokeWidth="3" />
        <text x="160" y="145" textAnchor="middle" fill="#6366F1" fontSize="10">
          Lens
        </text>

        {/* Sensor array */}
        <g transform="translate(220, 30)">
          <rect x="-5" y="-5" width="130" height="130" fill="#1F2937" rx="4" />
          {pixelValues.map((value, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isSelected = showingPixel === i;
            return (
              <g key={i}>
                <rect
                  x={col * 15}
                  y={row * 15}
                  width="14"
                  height="14"
                  fill={`rgb(${value}, ${value}, ${value})`}
                  stroke={isSelected ? '#22C55E' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                  className="cursor-pointer"
                  onMouseEnter={() => { setShowingPixel(i); setHasExploredTwist(true); }}
                  onMouseLeave={() => setShowingPixel(null)}
                />
              </g>
            );
          })}
          <text x="60" y="135" textAnchor="middle" fill="#9CA3AF" fontSize="10">
            Image Sensor (8×8)
          </text>
        </g>

        {/* Pixel detail */}
        {showingPixel !== null && (
          <g transform="translate(290, 170)">
            <rect x="0" y="-25" width="100" height="45" fill="#374151" rx="6" />
            <text x="50" y="-8" textAnchor="middle" fill="white" fontSize="10">
              Pixel {showingPixel}
            </text>
            <text x="50" y="10" textAnchor="middle" fill="#22C55E" fontSize="12" fontWeight="bold">
              {pixelValues[showingPixel]} / 255
            </text>
          </g>
        )}

        {/* Arrow showing light path */}
        <path
          d="M 120 90 L 145 90 M 175 90 L 215 90"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="4"
        />
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">☀️📊</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Your Solar Panel is a Light Meter!
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        Solar panels don&apos;t just generate power—they can precisely measure
        how much light is hitting them. The same physics that makes electricity
        makes them perfect <strong>light detectors</strong>!
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
        <p className="text-amber-800">
          📷 This principle is exactly how digital cameras work!
          Each pixel is a tiny photodetector measuring light intensity.
        </p>
      </div>
      <p className="text-gray-600 mb-6">
        Let&apos;s explore the photovoltaic effect and see how solar cells
        respond to different light conditions.
      </p>
      <button
        onMouseDown={() => goToPhase('predict')}
        className="px-8 py-4 bg-amber-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-amber-600 transition-colors"
      >
        Explore Light Detection →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800">
          A solar cell is placed in sunlight. If the light intensity doubles,
          what happens to the electrical current it produces?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'same', label: 'Stays the same (limited by material)' },
          { id: 'double', label: 'Approximately doubles' },
          { id: 'quadruple', label: 'Quadruples (like power with voltage)' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? option.id === 'double'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="font-medium text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-4 rounded-xl mb-4 ${
          prediction === 'double' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={prediction === 'double' ? 'text-green-800' : 'text-amber-800'}>
            {prediction === 'double' ? (
              <><strong>Correct!</strong> Photocurrent is directly proportional to light intensity. Twice the photons = twice the current. This linearity makes solar cells excellent light meters!</>
            ) : (
              <><strong>Good guess!</strong> Actually, photocurrent scales linearly with intensity. Each photon creates one electron-hole pair, so double photons = double current.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
        >
          Test It Out →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Solar Cell Light Meter</h2>
      <p className="text-gray-600 mb-4">
        Adjust light intensity, cell angle, and wavelength to see how output changes.
      </p>

      {renderSolarCellSimulator()}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Light Intensity: {lightIntensity}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={lightIntensity}
            onChange={e => { setLightIntensity(Number(e.target.value)); handleExperiment(); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cell Angle: {cellAngle}°
          </label>
          <input
            type="range"
            min="0"
            max="80"
            value={cellAngle}
            onChange={e => { setCellAngle(Number(e.target.value)); handleExperiment(); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Light Wavelength:</label>
          <div className="flex gap-2">
            {[
              { id: 'visible' as const, label: 'Visible', color: 'bg-amber-500' },
              { id: 'infrared' as const, label: 'Infrared', color: 'bg-red-500' },
              { id: 'uv' as const, label: 'UV', color: 'bg-purple-500' },
            ].map(w => (
              <button
                key={w.id}
                onMouseDown={() => { setWavelength(w.id); handleExperiment(); }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  wavelength === w.id
                    ? `${w.color} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          <strong>Notice:</strong> Current scales linearly with intensity. Angle follows cos(θ).
          Silicon is most efficient at visible light wavelengths!
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExperimented}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExperimented
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExperimented ? 'Continue to Review →' : 'Try adjusting the controls...'}
      </button>
    </div>
  );

  const renderReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">The Photovoltaic Effect</h2>

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-5 mb-6">
        <div className="text-center mb-3">
          <span className="text-2xl">Photon → Electron-Hole Pair → Current</span>
        </div>
        <p className="text-amber-800 text-center text-sm">
          Each photon with enough energy frees one electron, creating measurable current
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">⚡ Linear Response</h3>
          <p className="text-gray-600 text-sm">
            Photocurrent is proportional to photon flux. This makes solar cells
            ideal for accurate light intensity measurements.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">📐 Cosine Law</h3>
          <p className="text-gray-600 text-sm">
            Tilting the cell reduces effective light capture by cos(θ).
            At 60°, you get half the current.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🌈 Spectral Sensitivity</h3>
          <p className="text-gray-600 text-sm">
            Silicon responds best to red/near-IR light (~900nm).
            Different materials have different peak sensitivities.
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
      >
        Now for a Twist... →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">The Digital Camera Connection</h2>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <p className="text-purple-800">
          A digital camera sensor has millions of pixels. What is each pixel
          fundamentally doing?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'color', label: 'Detecting the color of light' },
          { id: 'memory', label: 'Storing image data in memory' },
          { id: 'photodetector', label: 'Measuring light intensity (like a tiny solar cell)' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? option.id === 'photodetector'
                  ? 'border-green-500 bg-green-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="font-medium text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-4 rounded-xl mb-4 ${
          twistPrediction === 'photodetector' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={twistPrediction === 'photodetector' ? 'text-green-800' : 'text-amber-800'}>
            {twistPrediction === 'photodetector' ? (
              <><strong>Exactly!</strong> Each pixel is a tiny photodiode that measures light intensity. Color comes from filters placed over groups of pixels (Bayer pattern)!</>
            ) : (
              <><strong>Close!</strong> Each pixel is fundamentally a light intensity detector—a tiny photodiode. Color is added via tiny color filters over pixel groups.</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
        >
          Explore Camera Sensors →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Camera Sensor Demo</h2>
      <p className="text-gray-600 mb-4">
        Hover over pixels to see their intensity values. Each is a photodetector!
      </p>

      {renderCameraSensor()}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-blue-800 text-sm">
          <strong>Real sensors:</strong> Your phone camera has 12+ megapixels—12 million tiny
          photodetectors, each measuring light intensity 30-60 times per second for video!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">📷</div>
          <div className="text-sm font-medium text-gray-700">CCD/CMOS</div>
          <div className="text-xs text-gray-500">Photodiode arrays</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🎨</div>
          <div className="text-sm font-medium text-gray-700">Bayer Filter</div>
          <div className="text-xs text-gray-500">RGGB color pattern</div>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExploredTwist}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExploredTwist
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExploredTwist ? 'Continue →' : 'Hover over some pixels...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Photodetectors Everywhere</h2>

      <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-gray-800 mb-3 text-center">The Photoelectric Family</h3>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-2xl mb-1">☀️</div>
            <div className="text-xs text-gray-600">Solar Cells</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📷</div>
            <div className="text-xs text-gray-600">Camera Sensors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">💡</div>
            <div className="text-xs text-gray-600">Light Sensors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">🩺</div>
            <div className="text-xs text-gray-600">Pulse Oximeters</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">📊 Same Physics, Different Uses</h4>
          <p className="text-gray-600 text-sm">
            Solar cells for power, photodiodes for detection—both use the photovoltaic effect.
            The design differs based on optimization goals.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">🔢 Digital Imaging</h4>
          <p className="text-gray-600 text-sm">
            Camera sensors convert continuous light intensity into discrete digital values
            (0-255 for 8-bit images).
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
      >
        Apply This Knowledge →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Real-World Applications</h2>
      <p className="text-gray-600 mb-6">
        See how photodetection shapes modern technology.
      </p>

      <div className="space-y-4">
        {[
          {
            title: 'Automatic Screen Brightness',
            icon: '📱',
            description: 'Phone light sensors adjust display brightness using ambient light readings',
          },
          {
            title: 'Barcode Scanners',
            icon: '📊',
            description: 'Photodetectors read the pattern of light/dark bars as products pass',
          },
          {
            title: 'Solar Tracking Systems',
            icon: '☀️',
            description: 'Pairs of solar cells detect which direction has more light to aim panels',
          },
        ].map((app, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all ${
              completedApps.has(index)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{app.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{app.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{app.description}</p>
              </div>
              {!completedApps.has(index) && (
                <button
                  onMouseDown={() => handleCompleteApp(index)}
                  className="px-3 py-1 bg-amber-100 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  Got it
                </button>
              )}
              {completedApps.has(index) && (
                <span className="text-green-500 text-xl">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={completedApps.size < 3}
        className={`w-full py-3 mt-6 rounded-xl font-bold transition-colors ${
          completedApps.size >= 3
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {completedApps.size >= 3 ? 'Take the Test →' : `Review all applications (${completedApps.size}/3)`}
      </button>
    </div>
  );

  const renderTest = () => {
    const questions = [
      {
        question: 'How does photocurrent relate to light intensity?',
        options: [
          'Logarithmically (gets harder to increase)',
          'Linearly (proportional)',
          'Exponentially (accelerates)',
        ],
      },
      {
        question: 'What determines a pixel\'s value in a digital camera?',
        options: [
          'The color of light hitting it',
          'Random electrical noise',
          'Light intensity measured by a photodetector',
        ],
      },
      {
        question: 'Why does tilting a solar cell reduce its output?',
        options: [
          'Less effective light capture area (cosine law)',
          'The cell heats up and loses efficiency',
          'Photons can\'t hit at an angle',
        ],
      },
    ];

    return (
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Knowledge Check</h2>

        {testScore === null ? (
          <>
            <div className="space-y-6 mb-6">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="font-medium text-gray-800 mb-3">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={() => handleTestAnswer(qIndex, oIndex)}
                        className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-amber-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onMouseDown={handleSubmitTest}
              disabled={testAnswers.includes(-1)}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                !testAnswers.includes(-1)
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answers
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className={`text-6xl mb-4 ${testScore >= 2 ? 'animate-bounce' : ''}`}>
              {testScore >= 2 ? '☀️' : '📚'}
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">
              {testScore} / 3 Correct
            </p>
            <p className="text-gray-600 mb-6">
              {testScore >= 2
                ? 'You understand photodetection!'
                : 'Review the concepts and try again.'}
            </p>
            <button
              onMouseDown={nextPhase}
              className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
            >
              {testScore >= 2 ? 'Complete Lesson →' : 'See Summary →'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">☀️🏆</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Photodetection Master!
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        You now understand how solar cells measure light—the same physics powering digital cameras!
      </p>

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-6 mb-6 text-left">
        <h3 className="font-bold text-gray-800 mb-4">Key Takeaways:</h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-amber-500">✓</span>
            <span>Photocurrent is proportional to light intensity</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">✓</span>
            <span>Solar cells can precisely measure light (photovoltaic effect)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">✓</span>
            <span>Camera pixels are millions of tiny photodetectors</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">✓</span>
            <span>The cosine law affects light capture at angles</span>
          </li>
        </ul>
      </div>

      <button
        onMouseDown={() => goToPhase('hook')}
        className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
      >
        Review Again
      </button>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
      <div className="max-w-lg mx-auto">
        {renderPhaseIndicator()}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
