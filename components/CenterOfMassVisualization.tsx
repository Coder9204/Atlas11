'use client';

import React from 'react';

// ============================================================================
// CENTER OF MASS - CLARITY-FIRST VISUALIZATION
// Design principle: Make the physics OBVIOUS, not the objects realistic
// ============================================================================

interface VisualizationProps {
  comY: number;           // -1 (below) to +1 (above) relative to pivot
  isBalanced: boolean;
  tiltAngle: number;
  showCOM: boolean;
  hasWeight: boolean;
  weightPosition: number; // -1 (left/fork side) to +1 (right)
  timeRef: number;        // For animations
  size?: 'large' | 'medium';
}

// The key insight: Show a SIDE VIEW so "below" actually appears BELOW on screen
export const CenterOfMassVisualization: React.FC<VisualizationProps> = ({
  comY,
  isBalanced,
  tiltAngle,
  showCOM,
  hasWeight,
  weightPosition,
  timeRef,
  size = 'large',
}) => {
  const w = size === 'large' ? 440 : 360;
  const h = size === 'large' ? 380 : 320;
  const scale = size === 'large' ? 1 : 0.85;

  // Layout constants
  const pivotX = w / 2;
  const pivotY = h * 0.35;  // Pivot point - this is the KEY reference
  const tableY = h * 0.85;

  // Wobble animation for balanced state
  const wobble = isBalanced ? Math.sin(timeRef * 2) * 0.8 : 0;
  const totalAngle = tiltAngle + wobble;

  // COM position (scaled from -1/+1 to actual pixels)
  // CRITICAL: Positive comY = ABOVE pivot (unstable), Negative = BELOW (stable)
  const comYPixels = comY * 60 * scale;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', maxWidth: `${w}px`, margin: '0 auto' }}
    >
      <defs>
        {/* === GRADIENTS === */}

        {/* Sky/background gradient */}
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>

        {/* Glass - realistic transparent look */}
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.3"/>
          <stop offset="15%" stopColor="#22d3ee" stopOpacity="0.15"/>
          <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.08"/>
          <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.3"/>
        </linearGradient>

        {/* Table wood grain */}
        <linearGradient id="tableGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#78350f"/>
          <stop offset="50%" stopColor="#92400e"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>

        {/* Metal beam - silver with depth */}
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0"/>
          <stop offset="30%" stopColor="#cbd5e1"/>
          <stop offset="50%" stopColor="#f1f5f9"/>
          <stop offset="70%" stopColor="#94a3b8"/>
          <stop offset="100%" stopColor="#64748b"/>
        </linearGradient>

        {/* Heavy weight (fork side) - golden brass */}
        <radialGradient id="weightGrad" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#fcd34d"/>
          <stop offset="50%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#b45309"/>
        </radialGradient>

        {/* COM indicator - pulsing red */}
        <radialGradient id="comGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fca5a5"/>
          <stop offset="50%" stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#b91c1c"/>
        </radialGradient>

        {/* Pivot point - bright green */}
        <radialGradient id="pivotGrad" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#86efac"/>
          <stop offset="50%" stopColor="#22c55e"/>
          <stop offset="100%" stopColor="#15803d"/>
        </radialGradient>

        {/* Glow filters */}
        <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>

        <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>

        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* === BACKGROUND === */}
      <rect width={w} height={h} fill="url(#bgGrad)"/>

      {/* === SIDE VIEW LABEL - Make it clear what user is seeing === */}
      <g transform={`translate(${w / 2}, ${18 * scale})`}>
        <rect
          x={-60 * scale}
          y={-10 * scale}
          width={120 * scale}
          height={20 * scale}
          rx={10 * scale}
          fill="#3b82f620"
          stroke="#3b82f6"
          strokeWidth="1"
        />
        <text
          textAnchor="middle"
          y={4 * scale}
          fill="#60a5fa"
          fontSize={11 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          👁️ SIDE VIEW
        </text>
      </g>

      {/* === PIVOT LEVEL LINE - Horizontal dashed line across screen === */}
      <line
        x1={20 * scale}
        y1={pivotY}
        x2={w - 20 * scale}
        y2={pivotY}
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="8,4"
        opacity="0.5"
      />

      {/* === ZONE LABELS - More prominent, on the LEFT side === */}
      {/* "ABOVE PIVOT" zone - TOP of screen */}
      <g transform={`translate(${35 * scale}, ${pivotY - 50 * scale})`}>
        <rect
          x={-30 * scale}
          y={-16 * scale}
          width={60 * scale}
          height={32 * scale}
          rx={6}
          fill="#ef444430"
          stroke="#ef4444"
          strokeWidth="2"
        />
        <text
          textAnchor="middle"
          y={-2 * scale}
          fill="#f87171"
          fontSize={12 * scale}
          fontFamily="system-ui"
          fontWeight="700"
        >
          ⬆️ ABOVE
        </text>
        <text
          y={10 * scale}
          textAnchor="middle"
          fill="#fca5a5"
          fontSize={9 * scale}
          fontFamily="system-ui"
        >
          UNSTABLE
        </text>
      </g>

      {/* "BELOW PIVOT" zone - BOTTOM of screen */}
      <g transform={`translate(${35 * scale}, ${pivotY + 60 * scale})`}>
        <rect
          x={-30 * scale}
          y={-16 * scale}
          width={60 * scale}
          height={32 * scale}
          rx={6}
          fill="#22c55e30"
          stroke="#22c55e"
          strokeWidth="2"
        />
        <text
          textAnchor="middle"
          y={-2 * scale}
          fill="#4ade80"
          fontSize={12 * scale}
          fontFamily="system-ui"
          fontWeight="700"
        >
          ⬇️ BELOW
        </text>
        <text
          y={10 * scale}
          textAnchor="middle"
          fill="#86efac"
          fontSize={9 * scale}
          fontFamily="system-ui"
        >
          STABLE
        </text>
      </g>

      {/* === TABLE === */}
      <rect
        x={0}
        y={tableY}
        width={w}
        height={h - tableY}
        fill="url(#tableGrad)"
      />
      <rect
        x={0}
        y={tableY}
        width={w}
        height={4}
        fill="#a16207"
      />

      {/* === GLASS (Side View) === */}
      <g>
        {/* Glass body */}
        <path
          d={`
            M ${pivotX - 25 * scale} ${tableY}
            L ${pivotX - 20 * scale} ${pivotY + 15 * scale}
            Q ${pivotX} ${pivotY + 5 * scale} ${pivotX + 20 * scale} ${pivotY + 15 * scale}
            L ${pivotX + 25 * scale} ${tableY}
            Z
          `}
          fill="url(#glassGrad)"
          stroke="#22d3ee"
          strokeWidth="2"
        />

        {/* Glass rim highlight */}
        <ellipse
          cx={pivotX}
          cy={pivotY + 12 * scale}
          rx={20 * scale}
          ry={4 * scale}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="2"
        />

        {/* Glass label */}
        <text
          x={pivotX}
          y={tableY + 20 * scale}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="500"
        >
          GLASS RIM
        </text>
      </g>

      {/* === PIVOT POINT (on glass rim) === */}
      <g filter="url(#glowGreen)">
        <circle
          cx={pivotX}
          cy={pivotY}
          r={10 * scale}
          fill="url(#pivotGrad)"
          stroke="#fff"
          strokeWidth="2"
        />
        {/* Inner dot */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={3 * scale}
          fill="#fff"
        />
      </g>

      {/* Pivot label - MORE PROMINENT with pointer */}
      <g transform={`translate(${pivotX + 20 * scale}, ${pivotY})`}>
        {/* Arrow pointing to pivot */}
        <line
          x1={0}
          y1={0}
          x2={25 * scale}
          y2={0}
          stroke="#22c55e"
          strokeWidth="2"
        />
        <rect
          x={25 * scale}
          y={-14 * scale}
          width={85 * scale}
          height={28 * scale}
          rx={6}
          fill="#22c55e"
          opacity="0.25"
          stroke="#22c55e"
          strokeWidth="2"
        />
        <text
          x={67 * scale}
          y={-2 * scale}
          textAnchor="middle"
          fill="#4ade80"
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          ⚫ PIVOT POINT
        </text>
        <text
          x={67 * scale}
          y={10 * scale}
          textAnchor="middle"
          fill="#86efac"
          fontSize={9 * scale}
          fontFamily="system-ui"
        >
          (glass rim edge)
        </text>
      </g>

      {/* === THE BALANCING BEAM SYSTEM === */}
      <g
        transform={`translate(${pivotX}, ${pivotY}) rotate(${totalAngle})`}
        filter="url(#shadow)"
      >
        {/* Main beam (represents the toothpick/stick) */}
        <rect
          x={-120 * scale}
          y={-5 * scale}
          width={240 * scale}
          height={10 * scale}
          rx={5 * scale}
          fill="url(#beamGrad)"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Left side: Heavy weight (represents fork mass) */}
        <g transform={`translate(${-85 * scale}, 0)`}>
          {/* Weight body */}
          <rect
            x={-25 * scale}
            y={5 * scale}
            width={50 * scale}
            height={70 * scale}
            rx={6 * scale}
            fill="url(#weightGrad)"
            stroke="#92400e"
            strokeWidth="2"
          />
          {/* Weight highlight */}
          <rect
            x={-20 * scale}
            y={10 * scale}
            width={8 * scale}
            height={55 * scale}
            rx={3 * scale}
            fill="rgba(255,255,255,0.3)"
          />
          {/* Hanging connector */}
          <rect
            x={-3 * scale}
            y={-5 * scale}
            width={6 * scale}
            height={15 * scale}
            rx={2 * scale}
            fill="#94a3b8"
          />
          {/* Weight label */}
          <text
            y={85 * scale}
            textAnchor="middle"
            fill="#fcd34d"
            fontSize={10 * scale}
            fontFamily="system-ui"
            fontWeight="600"
          >
            HEAVY
          </text>
          <text
            y={97 * scale}
            textAnchor="middle"
            fill="#fcd34d"
            fontSize={9 * scale}
            fontFamily="system-ui"
          >
            (fork side)
          </text>
        </g>

        {/* Right side: Light end */}
        <g transform={`translate(${85 * scale}, 0)`}>
          <circle
            r={12 * scale}
            cy={20 * scale}
            fill="#475569"
            stroke="#64748b"
            strokeWidth="2"
          />
          <text
            y={45 * scale}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10 * scale}
            fontFamily="system-ui"
            fontWeight="500"
          >
            LIGHT
          </text>
        </g>

        {/* === ADDED WEIGHT (if present) === */}
        {hasWeight && (
          <g transform={`translate(${weightPosition * 80 * scale}, 0)`}>
            <circle
              r={14 * scale}
              cy={-18 * scale}
              fill="#c084fc"
              stroke="#a855f7"
              strokeWidth="2"
            />
            <text
              y={-18 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={9 * scale}
              fontFamily="system-ui"
              fontWeight="700"
            >
              +
            </text>
            <text
              y={-35 * scale}
              textAnchor="middle"
              fill="#c084fc"
              fontSize={9 * scale}
              fontFamily="system-ui"
              fontWeight="600"
            >
              ADDED
            </text>
          </g>
        )}

        {/* === CENTER OF MASS INDICATOR === */}
        {showCOM && (
          <g
            transform={`translate(0, ${comYPixels})`}
            filter="url(#glowRed)"
          >
            {/* Vertical line from beam to COM */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-comYPixels}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4,2"
              opacity="0.6"
            />

            {/* COM outer ring - animated */}
            <circle
              r={18 * scale}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.8"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* COM main circle */}
            <circle
              r={12 * scale}
              fill="url(#comGrad)"
              stroke="#fff"
              strokeWidth="2"
            />

            {/* COM crosshair */}
            <line x1={-8 * scale} y1={0} x2={8 * scale} y2={0} stroke="#fff" strokeWidth="1.5"/>
            <line x1={0} y1={-8 * scale} x2={0} y2={8 * scale} stroke="#fff" strokeWidth="1.5"/>

            {/* COM label - CLEARER explanation */}
            <g transform={`translate(${-90 * scale}, 0)`}>
              <rect
                x={0}
                y={-20 * scale}
                width={80 * scale}
                height={40 * scale}
                rx={6}
                fill="rgba(0,0,0,0.85)"
                stroke="#ef4444"
                strokeWidth="2"
              />
              <text
                x={40 * scale}
                y={-6 * scale}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={11 * scale}
                fontFamily="system-ui"
                fontWeight="700"
              >
                🎯 COM
              </text>
              <text
                x={40 * scale}
                y={8 * scale}
                textAnchor="middle"
                fill="#fca5a5"
                fontSize={8 * scale}
                fontFamily="system-ui"
              >
                Center of Mass
              </text>
              <text
                x={40 * scale}
                y={18 * scale}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={7 * scale}
                fontFamily="system-ui"
              >
                (balance point)
              </text>
            </g>
          </g>
        )}
      </g>

      {/* === STATUS DISPLAY - Top right corner === */}
      <g transform={`translate(${w - 145 * scale}, ${12 * scale})`}>
        <rect
          width={135 * scale}
          height={55 * scale}
          rx={8}
          fill={isBalanced ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
          stroke={isBalanced ? '#22c55e' : '#ef4444'}
          strokeWidth="2"
        />
        <text
          x={67 * scale}
          y={20 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#4ade80' : '#f87171'}
          fontSize={16 * scale}
          fontFamily="system-ui"
          fontWeight="700"
        >
          {isBalanced ? '✓ BALANCED' : '✗ FALLING'}
        </text>
        <text
          x={67 * scale}
          y={36 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#86efac' : '#fca5a5'}
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          {comY < 0 ? '🎯 COM is BELOW ⬇️' : '🎯 COM is ABOVE ⬆️'}
        </text>
        <text
          x={67 * scale}
          y={48 * scale}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9 * scale}
          fontFamily="system-ui"
        >
          {comY < 0 ? 'gravity restores balance' : 'gravity tips it over'}
        </text>
      </g>

      {/* === PHYSICS EXPLANATION - cleaner, at bottom === */}
      <g transform={`translate(${w / 2}, ${h - 18 * scale})`}>
        <rect
          x={-160 * scale}
          y={-10 * scale}
          width={320 * scale}
          height={22 * scale}
          rx={4}
          fill="rgba(0,0,0,0.5)"
        />
        <text
          textAnchor="middle"
          y={4 * scale}
          fill={isBalanced ? "#86efac" : "#fca5a5"}
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="500"
        >
          {isBalanced
            ? "🔑 KEY: Heavy fork pulls COM down below the pivot → STABLE balance!"
            : "⚠️ COM moved above pivot → Gravity tips it over → FALLS!"
          }
        </text>
      </g>

      {/* === GRAVITY ARROW === */}
      <g transform={`translate(${50 * scale}, ${pivotY + 30 * scale})`}>
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={40 * scale}
          stroke="#94a3b8"
          strokeWidth="3"
          markerEnd="url(#gravityArrow)"
        />
        <text
          x={15 * scale}
          y={25 * scale}
          fill="#94a3b8"
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          g
        </text>
      </g>

      {/* Gravity arrow marker */}
      <defs>
        <marker id="gravityArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#94a3b8"/>
        </marker>
      </defs>
    </svg>
  );
};

export default CenterOfMassVisualization;
