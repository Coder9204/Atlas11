'use client';

import React from 'react';

// ============================================================================
// CENTER OF MASS - PREMIUM SVG VISUALIZATION
// Design principle: Make the physics OBVIOUS with premium visual polish
// Following WaveParticleDualityRenderer pattern for gradients and filters
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
        {/* ============================================================================ */}
        {/* PREMIUM GRADIENTS - com* prefix for unique IDs */}
        {/* ============================================================================ */}

        {/* Premium background gradient with depth */}
        <linearGradient id="comBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#030712"/>
          <stop offset="25%" stopColor="#0a0f1a"/>
          <stop offset="50%" stopColor="#0f172a"/>
          <stop offset="75%" stopColor="#1a1f2e"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>

        {/* Premium glass gradient with realistic refraction */}
        <linearGradient id="comGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.35"/>
          <stop offset="15%" stopColor="#22d3ee" stopOpacity="0.2"/>
          <stop offset="35%" stopColor="#67e8f9" stopOpacity="0.08"/>
          <stop offset="50%" stopColor="#a5f3fc" stopOpacity="0.15"/>
          <stop offset="75%" stopColor="#22d3ee" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.3"/>
        </linearGradient>

        {/* Glass rim highlight gradient */}
        <linearGradient id="comGlassRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4"/>
          <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.9"/>
          <stop offset="50%" stopColor="#a5f3fc" stopOpacity="1"/>
          <stop offset="75%" stopColor="#22d3ee" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4"/>
        </linearGradient>

        {/* Premium wood table with rich grain */}
        <linearGradient id="comTableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#451a03"/>
          <stop offset="20%" stopColor="#78350f"/>
          <stop offset="40%" stopColor="#92400e"/>
          <stop offset="60%" stopColor="#78350f"/>
          <stop offset="80%" stopColor="#a16207"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>

        {/* Table edge highlight */}
        <linearGradient id="comTableEdgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b45309"/>
          <stop offset="30%" stopColor="#92400e"/>
          <stop offset="100%" stopColor="#451a03"/>
        </linearGradient>

        {/* Premium brushed metal beam */}
        <linearGradient id="comBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9"/>
          <stop offset="15%" stopColor="#e2e8f0"/>
          <stop offset="30%" stopColor="#cbd5e1"/>
          <stop offset="50%" stopColor="#f8fafc"/>
          <stop offset="70%" stopColor="#94a3b8"/>
          <stop offset="85%" stopColor="#64748b"/>
          <stop offset="100%" stopColor="#475569"/>
        </linearGradient>

        {/* Beam edge shine */}
        <linearGradient id="comBeamShineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5"/>
          <stop offset="20%" stopColor="#e2e8f0" stopOpacity="0.9"/>
          <stop offset="50%" stopColor="#f8fafc" stopOpacity="1"/>
          <stop offset="80%" stopColor="#e2e8f0" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.5"/>
        </linearGradient>

        {/* Premium heavy weight (fork side) - golden brass with depth */}
        <radialGradient id="comWeightGrad" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="20%" stopColor="#fcd34d"/>
          <stop offset="45%" stopColor="#f59e0b"/>
          <stop offset="70%" stopColor="#d97706"/>
          <stop offset="90%" stopColor="#b45309"/>
          <stop offset="100%" stopColor="#78350f"/>
        </radialGradient>

        {/* Weight highlight */}
        <linearGradient id="comWeightHighlightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>

        {/* Premium COM indicator - pulsing red with glow */}
        <radialGradient id="comCOMGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef2f2"/>
          <stop offset="20%" stopColor="#fca5a5"/>
          <stop offset="45%" stopColor="#f87171"/>
          <stop offset="70%" stopColor="#ef4444"/>
          <stop offset="90%" stopColor="#dc2626"/>
          <stop offset="100%" stopColor="#b91c1c"/>
        </radialGradient>

        {/* COM outer ring gradient */}
        <linearGradient id="comCOMRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.9"/>
          <stop offset="25%" stopColor="#ef4444" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#f87171" stopOpacity="0.8"/>
          <stop offset="75%" stopColor="#ef4444" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.9"/>
        </linearGradient>

        {/* Premium pivot point - emerald green with depth */}
        <radialGradient id="comPivotGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#d1fae5"/>
          <stop offset="20%" stopColor="#86efac"/>
          <stop offset="45%" stopColor="#4ade80"/>
          <stop offset="70%" stopColor="#22c55e"/>
          <stop offset="90%" stopColor="#16a34a"/>
          <stop offset="100%" stopColor="#15803d"/>
        </radialGradient>

        {/* Pivot inner glow */}
        <radialGradient id="comPivotInnerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="50%" stopColor="#d1fae5"/>
          <stop offset="100%" stopColor="#86efac"/>
        </radialGradient>

        {/* Light end ball gradient */}
        <radialGradient id="comLightEndGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#94a3b8"/>
          <stop offset="25%" stopColor="#64748b"/>
          <stop offset="50%" stopColor="#475569"/>
          <stop offset="75%" stopColor="#334155"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </radialGradient>

        {/* Added clay/weight gradient - purple */}
        <radialGradient id="comAddedWeightGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e9d5ff"/>
          <stop offset="25%" stopColor="#d8b4fe"/>
          <stop offset="50%" stopColor="#c084fc"/>
          <stop offset="75%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </radialGradient>

        {/* Zone indicator gradients */}
        <linearGradient id="comUnstableZoneGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15"/>
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02"/>
        </linearGradient>

        <linearGradient id="comStableZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
          <stop offset="50%" stopColor="#22c55e" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
        </linearGradient>

        {/* ============================================================================ */}
        {/* PREMIUM GLOW FILTERS - Using feGaussianBlur + feMerge pattern */}
        {/* ============================================================================ */}

        {/* COM glow filter - red pulsing glow */}
        <filter id="comGlowRed" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur1"/>
          <feGaussianBlur stdDeviation="3" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Pivot glow filter - green */}
        <filter id="comGlowGreen" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur1"/>
          <feGaussianBlur stdDeviation="2" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Weight glow filter - golden */}
        <filter id="comGlowGold" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Glass shine filter */}
        <filter id="comGlassShine" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Drop shadow filter for 3D effect */}
        <filter id="comShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="3" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.4"/>
        </filter>

        {/* Soft inner shadow */}
        <filter id="comInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>

        {/* Added weight glow - purple */}
        <filter id="comGlowPurple" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Gravity arrow marker */}
        <marker id="comGravityArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#94a3b8"/>
        </marker>

        {/* Coordinate grid pattern */}
        <pattern id="comGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3"/>
        </pattern>

        {/* Fine grid pattern */}
        <pattern id="comGridFine" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="none" stroke="#1e293b" strokeWidth="0.25" strokeOpacity="0.5"/>
        </pattern>
      </defs>

      {/* ============================================================================ */}
      {/* BACKGROUND WITH COORDINATE GRID */}
      {/* ============================================================================ */}
      <rect width={w} height={h} fill="url(#comBgGrad)"/>
      <rect width={w} height={tableY} fill="url(#comGridFine)" opacity="0.4"/>
      <rect width={w} height={tableY} fill="url(#comGrid)" opacity="0.6"/>

      {/* Zone overlays - visual indication of stable/unstable regions */}
      <rect x={0} y={0} width={w} height={pivotY} fill="url(#comUnstableZoneGrad)"/>
      <rect x={0} y={pivotY} width={w} height={tableY - pivotY} fill="url(#comStableZoneGrad)"/>

      {/* ============================================================================ */}
      {/* PIVOT LEVEL LINE - Horizontal dashed line across screen */}
      {/* ============================================================================ */}
      <line
        x1={20 * scale}
        y1={pivotY}
        x2={w - 20 * scale}
        y2={pivotY}
        stroke="url(#comGlassRimGrad)"
        strokeWidth="2.5"
        strokeDasharray="10,5"
        opacity="0.6"
      />

      {/* ============================================================================ */}
      {/* PREMIUM TABLE WITH WOOD GRAIN */}
      {/* ============================================================================ */}
      <g>
        {/* Table shadow */}
        <rect
          x={0}
          y={tableY + 2}
          width={w}
          height={h - tableY}
          fill="#000000"
          opacity="0.3"
        />
        {/* Main table body */}
        <rect
          x={0}
          y={tableY}
          width={w}
          height={h - tableY}
          fill="url(#comTableGrad)"
        />
        {/* Table top edge highlight */}
        <rect
          x={0}
          y={tableY}
          width={w}
          height={5}
          fill="url(#comTableEdgeGrad)"
        />
        {/* Table reflection line */}
        <line
          x1={0}
          y1={tableY + 2}
          x2={w}
          y2={tableY + 2}
          stroke="#fcd34d"
          strokeWidth="1"
          opacity="0.2"
        />
      </g>

      {/* ============================================================================ */}
      {/* PREMIUM GLASS (Side View) WITH REALISTIC EFFECTS */}
      {/* ============================================================================ */}
      <g filter="url(#comGlassShine)">
        {/* Glass shadow on table */}
        <ellipse
          cx={pivotX}
          cy={tableY + 5}
          rx={28 * scale}
          ry={8 * scale}
          fill="#000000"
          opacity="0.3"
        />

        {/* Glass body with premium gradient */}
        <path
          d={`
            M ${pivotX - 28 * scale} ${tableY}
            L ${pivotX - 22 * scale} ${pivotY + 18 * scale}
            Q ${pivotX} ${pivotY + 6 * scale} ${pivotX + 22 * scale} ${pivotY + 18 * scale}
            L ${pivotX + 28 * scale} ${tableY}
            Z
          `}
          fill="url(#comGlassGrad)"
          stroke="url(#comGlassRimGrad)"
          strokeWidth="2"
        />

        {/* Glass internal refraction lines */}
        <path
          d={`
            M ${pivotX - 15 * scale} ${tableY - 10}
            Q ${pivotX - 10 * scale} ${pivotY + 30 * scale} ${pivotX - 8 * scale} ${pivotY + 20 * scale}
          `}
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d={`
            M ${pivotX + 12 * scale} ${tableY - 15}
            Q ${pivotX + 8 * scale} ${pivotY + 35 * scale} ${pivotX + 5 * scale} ${pivotY + 22 * scale}
          `}
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="1"
          opacity="0.25"
        />

        {/* Glass rim - elliptical top with shine */}
        <ellipse
          cx={pivotX}
          cy={pivotY + 14 * scale}
          rx={22 * scale}
          ry={5 * scale}
          fill="none"
          stroke="url(#comGlassRimGrad)"
          strokeWidth="2.5"
        />

        {/* Glass rim highlight shine */}
        <ellipse
          cx={pivotX - 8 * scale}
          cy={pivotY + 13 * scale}
          rx={8 * scale}
          ry={2 * scale}
          fill="#ffffff"
          opacity="0.4"
        />
      </g>

      {/* ============================================================================ */}
      {/* PREMIUM PIVOT POINT (on glass rim) WITH GLOW */}
      {/* ============================================================================ */}
      <g filter="url(#comGlowGreen)">
        {/* Outer glow ring */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={14 * scale}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          opacity="0.4"
        >
          <animate attributeName="r" values={`${14 * scale};${16 * scale};${14 * scale}`} dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0.6;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>

        {/* Main pivot circle */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={11 * scale}
          fill="url(#comPivotGrad)"
          stroke="#ffffff"
          strokeWidth="2.5"
        />

        {/* Inner highlight */}
        <circle
          cx={pivotX - 2 * scale}
          cy={pivotY - 2 * scale}
          r={4 * scale}
          fill="url(#comPivotInnerGrad)"
        />

        {/* Center dot */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={2 * scale}
          fill="#ffffff"
        />
      </g>

      {/* ============================================================================ */}
      {/* THE BALANCING BEAM SYSTEM WITH 3D EFFECTS */}
      {/* ============================================================================ */}
      <g
        transform={`translate(${pivotX}, ${pivotY}) rotate(${totalAngle})`}
        filter="url(#comShadow)"
      >
        {/* Beam shadow underneath */}
        <rect
          x={-122 * scale}
          y={2 * scale}
          width={244 * scale}
          height={12 * scale}
          rx={6 * scale}
          fill="#000000"
          opacity="0.3"
        />

        {/* Main beam with premium brushed metal */}
        <rect
          x={-120 * scale}
          y={-6 * scale}
          width={240 * scale}
          height={12 * scale}
          rx={6 * scale}
          fill="url(#comBeamGrad)"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Beam top shine line */}
        <rect
          x={-115 * scale}
          y={-5 * scale}
          width={230 * scale}
          height={2 * scale}
          rx={1 * scale}
          fill="url(#comBeamShineGrad)"
          opacity="0.7"
        />

        {/* ============================================================================ */}
        {/* LEFT SIDE: HEAVY WEIGHT (fork side) WITH 3D GRADIENT */}
        {/* ============================================================================ */}
        <g transform={`translate(${-85 * scale}, 0)`} filter="url(#comGlowGold)">
          {/* Weight shadow */}
          <rect
            x={-24 * scale}
            y={10 * scale}
            width={48 * scale}
            height={68 * scale}
            rx={7 * scale}
            fill="#000000"
            opacity="0.4"
          />

          {/* Weight body with premium gradient */}
          <rect
            x={-26 * scale}
            y={6 * scale}
            width={52 * scale}
            height={72 * scale}
            rx={8 * scale}
            fill="url(#comWeightGrad)"
            stroke="#92400e"
            strokeWidth="2"
          />

          {/* Weight highlight overlay */}
          <rect
            x={-22 * scale}
            y={10 * scale}
            width={20 * scale}
            height={60 * scale}
            rx={4 * scale}
            fill="url(#comWeightHighlightGrad)"
          />

          {/* Weight decorative lines */}
          <line
            x1={-10 * scale}
            y1={18 * scale}
            x2={18 * scale}
            y2={18 * scale}
            stroke="#d97706"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <line
            x1={-10 * scale}
            y1={68 * scale}
            x2={18 * scale}
            y2={68 * scale}
            stroke="#78350f"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Hanging connector */}
          <rect
            x={-4 * scale}
            y={-6 * scale}
            width={8 * scale}
            height={16 * scale}
            rx={3 * scale}
            fill="#94a3b8"
            stroke="#64748b"
            strokeWidth="1"
          />
        </g>

        {/* ============================================================================ */}
        {/* RIGHT SIDE: LIGHT END WITH 3D SPHERE */}
        {/* ============================================================================ */}
        <g transform={`translate(${85 * scale}, 0)`}>
          {/* Light end shadow */}
          <ellipse
            cx={2 * scale}
            cy={35 * scale}
            rx={12 * scale}
            ry={4 * scale}
            fill="#000000"
            opacity="0.3"
          />

          {/* Light end sphere with gradient */}
          <circle
            r={14 * scale}
            cy={20 * scale}
            fill="url(#comLightEndGrad)"
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* Sphere highlight */}
          <circle
            cx={-4 * scale}
            cy={15 * scale}
            r={5 * scale}
            fill="#94a3b8"
            opacity="0.5"
          />
        </g>

        {/* ============================================================================ */}
        {/* ADDED WEIGHT (if present) WITH GLOW */}
        {/* ============================================================================ */}
        {hasWeight && (
          <g transform={`translate(${weightPosition * 80 * scale}, 0)`} filter="url(#comGlowPurple)">
            {/* Added weight shadow */}
            <ellipse
              cx={0}
              cy={-8 * scale}
              rx={14 * scale}
              ry={5 * scale}
              fill="#000000"
              opacity="0.3"
            />

            {/* Added weight sphere with premium gradient */}
            <circle
              r={16 * scale}
              cy={-20 * scale}
              fill="url(#comAddedWeightGrad)"
              stroke="#7c3aed"
              strokeWidth="2"
            />

            {/* Weight highlight */}
            <circle
              cx={-5 * scale}
              cy={-25 * scale}
              r={5 * scale}
              fill="#e9d5ff"
              opacity="0.6"
            />

            {/* Plus symbol */}
            <text
              y={-20 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={14 * scale}
              fontFamily="system-ui"
              fontWeight="700"
            >
              +
            </text>
          </g>
        )}

        {/* ============================================================================ */}
        {/* CENTER OF MASS INDICATOR WITH PREMIUM GLOW */}
        {/* ============================================================================ */}
        {showCOM && (
          <g
            transform={`translate(0, ${comYPixels})`}
            filter="url(#comGlowRed)"
          >
            {/* Vertical connecting line from beam to COM */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-comYPixels}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="5,3"
              opacity="0.7"
            />

            {/* Outer animated ring */}
            <circle
              r={22 * scale}
              fill="none"
              stroke="url(#comCOMRingGrad)"
              strokeWidth="2"
              strokeDasharray="8,4"
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

            {/* Secondary pulsing ring */}
            <circle
              r={18 * scale}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              opacity="0.5"
            >
              <animate attributeName="r" values={`${18 * scale};${20 * scale};${18 * scale}`} dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0.3;0.5" dur="1.5s" repeatCount="indefinite"/>
            </circle>

            {/* Main COM circle with premium gradient */}
            <circle
              r={14 * scale}
              fill="url(#comCOMGrad)"
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {/* Inner highlight */}
            <circle
              cx={-3 * scale}
              cy={-3 * scale}
              r={5 * scale}
              fill="#fef2f2"
              opacity="0.5"
            />

            {/* Crosshair */}
            <line x1={-9 * scale} y1={0} x2={9 * scale} y2={0} stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            <line x1={0} y1={-9 * scale} x2={0} y2={9 * scale} stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
          </g>
        )}
      </g>

      {/* ============================================================================ */}
      {/* GRAVITY ARROW WITH IMPROVED STYLING */}
      {/* ============================================================================ */}
      <g transform={`translate(${55 * scale}, ${pivotY + 25 * scale})`}>
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={45 * scale}
          stroke="#94a3b8"
          strokeWidth="3.5"
          markerEnd="url(#comGravityArrow)"
        />
        <text
          x={18 * scale}
          y={25 * scale}
          fill="#94a3b8"
          fontSize={12 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          fontStyle="italic"
        >
          g
        </text>
      </g>

      {/* ============================================================================ */}
      {/* STATUS DISPLAY - Premium card style */}
      {/* ============================================================================ */}
      <g transform={`translate(${w - 150 * scale}, ${12 * scale})`}>
        <rect
          width={140 * scale}
          height={58 * scale}
          rx={10}
          fill={isBalanced ? 'rgba(20, 83, 45, 0.4)' : 'rgba(127, 29, 29, 0.4)'}
          stroke={isBalanced ? '#22c55e' : '#ef4444'}
          strokeWidth="2"
        />
        {/* Status gradient overlay */}
        <rect
          width={140 * scale}
          height={20 * scale}
          rx={10}
          fill={isBalanced ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
        />
        <text
          x={70 * scale}
          y={22 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#4ade80' : '#f87171'}
          fontSize={16 * scale}
          fontFamily="system-ui"
          fontWeight="700"
        >
          {isBalanced ? 'BALANCED' : 'FALLING'}
        </text>
        <text
          x={70 * scale}
          y={38 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#86efac' : '#fca5a5'}
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          {comY < 0 ? 'COM is BELOW' : 'COM is ABOVE'}
        </text>
        <text
          x={70 * scale}
          y={50 * scale}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9 * scale}
          fontFamily="system-ui"
        >
          {comY < 0 ? 'gravity restores balance' : 'gravity tips it over'}
        </text>
      </g>
    </svg>
  );
};

export default CenterOfMassVisualization;
