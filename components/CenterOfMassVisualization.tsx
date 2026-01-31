'use client';

import React from 'react';

// ============================================================================
// CENTER OF MASS - PREMIUM SVG VISUALIZATION
// Design principle: Make the physics OBVIOUS with premium visual polish
// Following WaveParticleDualityRenderer pattern for gradients and filters
// Enhanced with realistic 3D mass spheres and connecting structure
//
// PREMIUM DESIGN SYSTEM:
// - comr* prefix for all gradient/filter IDs (unique namespace)
// - 4-6 color stops for depth in all gradients
// - feGaussianBlur + feMerge pattern for professional glow effects
// - Radial gradients for 3D sphere effects with specular highlights
// - Ambient lighting and subtle animations
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
        {/* PREMIUM GRADIENTS - comr* prefix for unique IDs */}
        {/* Following WaveParticleDualityRenderer pattern with 4-6 color stops */}
        {/* ============================================================================ */}

        {/* Premium background gradient with depth - 6 stops for rich depth */}
        <linearGradient id="comrBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#030712"/>
          <stop offset="20%" stopColor="#0a0f1a"/>
          <stop offset="40%" stopColor="#0f172a"/>
          <stop offset="60%" stopColor="#131c2e"/>
          <stop offset="80%" stopColor="#1a2435"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>

        {/* Secondary diagonal background gradient - adds dimension */}
        <linearGradient id="comrBgGradDiag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.3"/>
          <stop offset="25%" stopColor="#1e3a5f" stopOpacity="0.1"/>
          <stop offset="50%" stopColor="#0c4a6e" stopOpacity="0.05"/>
          <stop offset="75%" stopColor="#1e3a5f" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.3"/>
        </linearGradient>

        {/* Premium ambient light gradient - 6 stops for atmosphere */}
        <radialGradient id="comrAmbientLight" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#1e40af" stopOpacity="0.12"/>
          <stop offset="15%" stopColor="#3b82f6" stopOpacity="0.08"/>
          <stop offset="35%" stopColor="#60a5fa" stopOpacity="0.05"/>
          <stop offset="55%" stopColor="#93c5fd" stopOpacity="0.03"/>
          <stop offset="75%" stopColor="#bfdbfe" stopOpacity="0.015"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Secondary warm ambient light - adds visual interest */}
        <radialGradient id="comrAmbientWarm" cx="70%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.06"/>
          <stop offset="30%" stopColor="#d97706" stopOpacity="0.03"/>
          <stop offset="60%" stopColor="#b45309" stopOpacity="0.015"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Premium glass gradient with realistic refraction - 6 stops */}
        <linearGradient id="comrGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.35"/>
          <stop offset="15%" stopColor="#22d3ee" stopOpacity="0.2"/>
          <stop offset="35%" stopColor="#67e8f9" stopOpacity="0.08"/>
          <stop offset="50%" stopColor="#a5f3fc" stopOpacity="0.15"/>
          <stop offset="75%" stopColor="#22d3ee" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.3"/>
        </linearGradient>

        {/* Glass interior depth gradient - 5 stops */}
        <radialGradient id="comrGlassInterior" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.08"/>
          <stop offset="25%" stopColor="#0891b2" stopOpacity="0.05"/>
          <stop offset="50%" stopColor="#0c4a6e" stopOpacity="0.03"/>
          <stop offset="75%" stopColor="#164e63" stopOpacity="0.02"/>
          <stop offset="100%" stopColor="#083344" stopOpacity="0.01"/>
        </radialGradient>

        {/* Glass rim highlight gradient - 6 stops for premium edge */}
        <linearGradient id="comrGlassRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3"/>
          <stop offset="15%" stopColor="#22d3ee" stopOpacity="0.7"/>
          <stop offset="40%" stopColor="#67e8f9" stopOpacity="0.95"/>
          <stop offset="60%" stopColor="#a5f3fc" stopOpacity="1"/>
          <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3"/>
        </linearGradient>

        {/* Glass internal caustics - 5 stops */}
        <linearGradient id="comrGlassCaustics" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="25%" stopColor="#e0f2fe" stopOpacity="0.2"/>
          <stop offset="50%" stopColor="#a5f3fc" stopOpacity="0.35"/>
          <stop offset="75%" stopColor="#67e8f9" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Glass reflection sweep - 4 stops */}
        <linearGradient id="comrGlassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.15"/>
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Premium wood table with rich grain - 6 stops */}
        <linearGradient id="comrTableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#451a03"/>
          <stop offset="15%" stopColor="#78350f"/>
          <stop offset="35%" stopColor="#92400e"/>
          <stop offset="55%" stopColor="#78350f"/>
          <stop offset="75%" stopColor="#a16207"/>
          <stop offset="90%" stopColor="#92400e"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>

        {/* Table surface shine gradient - 5 stops */}
        <linearGradient id="comrTableShine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" stopOpacity="0"/>
          <stop offset="25%" stopColor="#ca8a04" stopOpacity="0.15"/>
          <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.08"/>
          <stop offset="75%" stopColor="#ca8a04" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#b45309" stopOpacity="0"/>
        </linearGradient>

        {/* Table edge highlight - 4 stops */}
        <linearGradient id="comrTableEdgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ca8a04"/>
          <stop offset="25%" stopColor="#b45309"/>
          <stop offset="60%" stopColor="#92400e"/>
          <stop offset="100%" stopColor="#451a03"/>
        </linearGradient>

        {/* Table reflection gradient - 4 stops */}
        <linearGradient id="comrTableReflection" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.2"/>
          <stop offset="30%" stopColor="#ca8a04" stopOpacity="0.05"/>
          <stop offset="70%" stopColor="#78350f" stopOpacity="0"/>
          <stop offset="100%" stopColor="#451a03" stopOpacity="0"/>
        </linearGradient>

        {/* Premium brushed metal beam - 7 stops for realistic metal */}
        <linearGradient id="comrBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc"/>
          <stop offset="12%" stopColor="#e2e8f0"/>
          <stop offset="28%" stopColor="#cbd5e1"/>
          <stop offset="45%" stopColor="#f1f5f9"/>
          <stop offset="62%" stopColor="#94a3b8"/>
          <stop offset="80%" stopColor="#64748b"/>
          <stop offset="100%" stopColor="#475569"/>
        </linearGradient>

        {/* Beam secondary gradient for depth - 5 stops */}
        <linearGradient id="comrBeamDepth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.15"/>
          <stop offset="25%" stopColor="#cbd5e1" stopOpacity="0.08"/>
          <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.05"/>
          <stop offset="75%" stopColor="#64748b" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#475569" stopOpacity="0.1"/>
        </linearGradient>

        {/* Beam edge shine - 6 stops for premium highlight */}
        <linearGradient id="comrBeamShineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.3"/>
          <stop offset="15%" stopColor="#94a3b8" stopOpacity="0.6"/>
          <stop offset="35%" stopColor="#e2e8f0" stopOpacity="0.9"/>
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="65%" stopColor="#e2e8f0" stopOpacity="0.9"/>
          <stop offset="85%" stopColor="#94a3b8" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.3"/>
        </linearGradient>

        {/* Beam bottom shadow gradient - 4 stops */}
        <linearGradient id="comrBeamShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0"/>
          <stop offset="60%" stopColor="#0f172a" stopOpacity="0.3"/>
          <stop offset="85%" stopColor="#030712" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.6"/>
        </linearGradient>

        {/* Premium heavy weight (fork side) - golden brass with depth - 6 stops */}
        <radialGradient id="comrWeightGrad" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="20%" stopColor="#fcd34d"/>
          <stop offset="45%" stopColor="#f59e0b"/>
          <stop offset="70%" stopColor="#d97706"/>
          <stop offset="90%" stopColor="#b45309"/>
          <stop offset="100%" stopColor="#78350f"/>
        </radialGradient>

        {/* Weight highlight - 5 stops for specular */}
        <linearGradient id="comrWeightHighlightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
          <stop offset="20%" stopColor="#fef9c3" stopOpacity="0.7"/>
          <stop offset="45%" stopColor="#fef3c7" stopOpacity="0.5"/>
          <stop offset="70%" stopColor="#fcd34d" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>

        {/* Heavy mass sphere gradient - realistic 3D effect with 6 stops */}
        <radialGradient id="comrHeavyMassSphere" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#fef9c3"/>
          <stop offset="15%" stopColor="#fde047"/>
          <stop offset="35%" stopColor="#facc15"/>
          <stop offset="55%" stopColor="#eab308"/>
          <stop offset="80%" stopColor="#ca8a04"/>
          <stop offset="100%" stopColor="#854d0e"/>
        </radialGradient>

        {/* Heavy mass secondary gradient - adds depth - 4 stops */}
        <radialGradient id="comrHeavyMassDepth" cx="60%" cy="70%" r="50%">
          <stop offset="0%" stopColor="#78350f" stopOpacity="0.3"/>
          <stop offset="35%" stopColor="#92400e" stopOpacity="0.15"/>
          <stop offset="70%" stopColor="#b45309" stopOpacity="0.05"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Heavy mass specular highlight - 5 stops */}
        <radialGradient id="comrHeavyMassSpecular" cx="30%" cy="20%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98"/>
          <stop offset="25%" stopColor="#fefce8" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.4"/>
          <stop offset="75%" stopColor="#fcd34d" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Heavy mass rim light - 6 stops */}
        <linearGradient id="comrHeavyMassRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0"/>
          <stop offset="30%" stopColor="#fde047" stopOpacity="0.25"/>
          <stop offset="45%" stopColor="#fcd34d" stopOpacity="0.45"/>
          <stop offset="55%" stopColor="#fef9c3" stopOpacity="0.6"/>
          <stop offset="70%" stopColor="#fcd34d" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0"/>
        </linearGradient>

        {/* Heavy mass ambient occlusion - 4 stops */}
        <radialGradient id="comrHeavyMassAO" cx="50%" cy="85%" r="40%">
          <stop offset="0%" stopColor="#78350f" stopOpacity="0.4"/>
          <stop offset="40%" stopColor="#92400e" stopOpacity="0.2"/>
          <stop offset="70%" stopColor="#b45309" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Premium COM indicator - pulsing red with glow - 6 stops */}
        <radialGradient id="comrCOMGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef2f2"/>
          <stop offset="18%" stopColor="#fecaca"/>
          <stop offset="38%" stopColor="#fca5a5"/>
          <stop offset="58%" stopColor="#f87171"/>
          <stop offset="80%" stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#b91c1c"/>
        </radialGradient>

        {/* COM outer ring gradient - 6 stops for premium ring effect */}
        <linearGradient id="comrCOMRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecaca" stopOpacity="0.8"/>
          <stop offset="20%" stopColor="#fca5a5" stopOpacity="0.9"/>
          <stop offset="40%" stopColor="#ef4444" stopOpacity="0.7"/>
          <stop offset="60%" stopColor="#f87171" stopOpacity="0.85"/>
          <stop offset="80%" stopColor="#ef4444" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.8"/>
        </linearGradient>

        {/* COM pulsing aura gradient - 6 stops for distinctive glow */}
        <radialGradient id="comrCOMAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef2f2" stopOpacity="0.95"/>
          <stop offset="18%" stopColor="#fee2e2" stopOpacity="0.75"/>
          <stop offset="38%" stopColor="#fecaca" stopOpacity="0.55"/>
          <stop offset="58%" stopColor="#fca5a5" stopOpacity="0.35"/>
          <stop offset="78%" stopColor="#f87171" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </radialGradient>

        {/* COM secondary aura - adds depth - 5 stops */}
        <radialGradient id="comrCOMAura2" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5"/>
          <stop offset="25%" stopColor="#ef4444" stopOpacity="0.35"/>
          <stop offset="50%" stopColor="#f87171" stopOpacity="0.2"/>
          <stop offset="75%" stopColor="#fca5a5" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* COM inner core gradient - 5 stops */}
        <radialGradient id="comrCOMCore" cx="38%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="25%" stopColor="#fef2f2"/>
          <stop offset="50%" stopColor="#fee2e2"/>
          <stop offset="75%" stopColor="#fecaca"/>
          <stop offset="100%" stopColor="#fca5a5"/>
        </radialGradient>

        {/* COM diamond highlight - 5 stops */}
        <linearGradient id="comrCOMDiamond" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9"/>
          <stop offset="65%" stopColor="#fef2f2" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* COM energy ring gradient - 4 stops for animated rings */}
        <linearGradient id="comrCOMEnergyRing" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0"/>
          <stop offset="40%" stopColor="#f87171" stopOpacity="0.7"/>
          <stop offset="60%" stopColor="#f87171" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </linearGradient>

        {/* Premium pivot point - emerald green with depth - 6 stops */}
        <radialGradient id="comrPivotGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#dcfce7"/>
          <stop offset="18%" stopColor="#bbf7d0"/>
          <stop offset="38%" stopColor="#86efac"/>
          <stop offset="58%" stopColor="#4ade80"/>
          <stop offset="80%" stopColor="#22c55e"/>
          <stop offset="100%" stopColor="#15803d"/>
        </radialGradient>

        {/* Pivot inner glow - 4 stops */}
        <radialGradient id="comrPivotInnerGrad" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="35%" stopColor="#ecfdf5"/>
          <stop offset="70%" stopColor="#d1fae5"/>
          <stop offset="100%" stopColor="#86efac"/>
        </radialGradient>

        {/* Pivot outer aura - 5 stops for glow effect */}
        <radialGradient id="comrPivotAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.6"/>
          <stop offset="25%" stopColor="#22c55e" stopOpacity="0.4"/>
          <stop offset="50%" stopColor="#16a34a" stopOpacity="0.25"/>
          <stop offset="75%" stopColor="#15803d" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#166534" stopOpacity="0"/>
        </radialGradient>

        {/* Pivot ring gradient - 4 stops */}
        <linearGradient id="comrPivotRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86efac" stopOpacity="0.3"/>
          <stop offset="35%" stopColor="#4ade80" stopOpacity="0.6"/>
          <stop offset="65%" stopColor="#4ade80" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#86efac" stopOpacity="0.3"/>
        </linearGradient>

        {/* Light end ball gradient - 6 stops for 3D sphere */}
        <radialGradient id="comrLightEndGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f1f5f9"/>
          <stop offset="18%" stopColor="#e2e8f0"/>
          <stop offset="38%" stopColor="#94a3b8"/>
          <stop offset="58%" stopColor="#64748b"/>
          <stop offset="80%" stopColor="#475569"/>
          <stop offset="100%" stopColor="#334155"/>
        </radialGradient>

        {/* Light end depth gradient - 4 stops */}
        <radialGradient id="comrLightEndDepth" cx="65%" cy="65%" r="45%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.35"/>
          <stop offset="40%" stopColor="#334155" stopOpacity="0.2"/>
          <stop offset="70%" stopColor="#475569" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Light end sphere specular - 5 stops */}
        <radialGradient id="comrLightEndSpecular" cx="25%" cy="20%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
          <stop offset="25%" stopColor="#f8fafc" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.45"/>
          <stop offset="75%" stopColor="#e2e8f0" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Light end rim light - 6 stops */}
        <linearGradient id="comrLightEndRim" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0"/>
          <stop offset="20%" stopColor="#94a3b8" stopOpacity="0.3"/>
          <stop offset="40%" stopColor="#cbd5e1" stopOpacity="0.5"/>
          <stop offset="60%" stopColor="#e2e8f0" stopOpacity="0.6"/>
          <stop offset="80%" stopColor="#cbd5e1" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0"/>
        </linearGradient>

        {/* Added clay/weight gradient - purple - 6 stops for 3D sphere */}
        <radialGradient id="comrAddedWeightGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#faf5ff"/>
          <stop offset="18%" stopColor="#f3e8ff"/>
          <stop offset="38%" stopColor="#e9d5ff"/>
          <stop offset="58%" stopColor="#c084fc"/>
          <stop offset="80%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </radialGradient>

        {/* Added weight depth - 4 stops */}
        <radialGradient id="comrAddedWeightDepth" cx="65%" cy="70%" r="45%">
          <stop offset="0%" stopColor="#581c87" stopOpacity="0.4"/>
          <stop offset="40%" stopColor="#6b21a8" stopOpacity="0.25"/>
          <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Added weight specular highlight - 5 stops */}
        <radialGradient id="comrAddedWeightSpecular" cx="25%" cy="20%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
          <stop offset="25%" stopColor="#faf5ff" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#f3e8ff" stopOpacity="0.5"/>
          <stop offset="75%" stopColor="#e9d5ff" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Added weight aura - 5 stops for glow effect */}
        <radialGradient id="comrAddedWeightAura" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5"/>
          <stop offset="25%" stopColor="#9333ea" stopOpacity="0.35"/>
          <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.2"/>
          <stop offset="75%" stopColor="#6d28d9" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Connecting rod gradient - metallic - 6 stops */}
        <linearGradient id="comrConnectingRod" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc"/>
          <stop offset="12%" stopColor="#f1f5f9"/>
          <stop offset="30%" stopColor="#e2e8f0"/>
          <stop offset="50%" stopColor="#94a3b8"/>
          <stop offset="75%" stopColor="#64748b"/>
          <stop offset="100%" stopColor="#475569"/>
        </linearGradient>

        {/* Connecting rod highlight - 5 stops */}
        <linearGradient id="comrConnectingRodHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" stopOpacity="0.2"/>
          <stop offset="25%" stopColor="#94a3b8" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.8"/>
          <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#475569" stopOpacity="0.2"/>
        </linearGradient>

        {/* Connecting rod shadow - 4 stops */}
        <linearGradient id="comrConnectingRodShadow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3"/>
          <stop offset="30%" stopColor="#334155" stopOpacity="0.15"/>
          <stop offset="70%" stopColor="#334155" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.3"/>
        </linearGradient>

        {/* Zone indicator gradients - 5 stops each for smooth transitions */}
        <linearGradient id="comrUnstableZoneGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18"/>
          <stop offset="25%" stopColor="#f87171" stopOpacity="0.12"/>
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.07"/>
          <stop offset="75%" stopColor="#dc2626" stopOpacity="0.035"/>
          <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.01"/>
        </linearGradient>

        <linearGradient id="comrStableZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18"/>
          <stop offset="25%" stopColor="#4ade80" stopOpacity="0.12"/>
          <stop offset="50%" stopColor="#22c55e" stopOpacity="0.07"/>
          <stop offset="75%" stopColor="#16a34a" stopOpacity="0.035"/>
          <stop offset="100%" stopColor="#15803d" stopOpacity="0.01"/>
        </linearGradient>

        {/* Stability indicator glow gradients */}
        <radialGradient id="comrStableGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4"/>
          <stop offset="50%" stopColor="#16a34a" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        <radialGradient id="comrUnstableGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4"/>
          <stop offset="50%" stopColor="#dc2626" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* ============================================================================ */}
        {/* PREMIUM GLOW FILTERS - Using feGaussianBlur + feMerge pattern */}
        {/* Following WaveParticleDualityRenderer for professional effects */}
        {/* ============================================================================ */}

        {/* COM glow filter - red pulsing glow with 4 blur layers */}
        <filter id="comrGlowRed" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" result="blur1"/>
          <feGaussianBlur stdDeviation="5" result="blur2"/>
          <feGaussianBlur stdDeviation="2.5" result="blur3"/>
          <feGaussianBlur stdDeviation="1" result="blur4"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="blur4"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* COM intense glow - for distinctive marker effect with 5 blur layers */}
        <filter id="comrGlowRedIntense" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="16" result="blur1"/>
          <feGaussianBlur stdDeviation="10" result="blur2"/>
          <feGaussianBlur stdDeviation="5" result="blur3"/>
          <feGaussianBlur stdDeviation="2" result="blur4"/>
          <feGaussianBlur stdDeviation="0.5" result="blur5"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="blur4"/>
            <feMergeNode in="blur5"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Pivot glow filter - green with 4 blur layers */}
        <filter id="comrGlowGreen" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur1"/>
          <feGaussianBlur stdDeviation="4" result="blur2"/>
          <feGaussianBlur stdDeviation="2" result="blur3"/>
          <feGaussianBlur stdDeviation="0.5" result="blur4"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="blur4"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Pivot soft glow - subtle ambient light */}
        <filter id="comrGlowGreenSoft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur1"/>
          <feGaussianBlur stdDeviation="2" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Weight glow filter - golden with 3 blur layers */}
        <filter id="comrGlowGold" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur1"/>
          <feGaussianBlur stdDeviation="4" result="blur2"/>
          <feGaussianBlur stdDeviation="1.5" result="blur3"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Mass sphere glow - for 3D spherical masses with 3 layers */}
        <filter id="comrMassSphereGlow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="5" result="blur1"/>
          <feGaussianBlur stdDeviation="2.5" result="blur2"/>
          <feGaussianBlur stdDeviation="1" result="blur3"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Glass shine filter with enhanced glow - 3 layers */}
        <filter id="comrGlassShine" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur1"/>
          <feGaussianBlur stdDeviation="2" result="blur2"/>
          <feGaussianBlur stdDeviation="0.5" result="blur3"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Glass caustics filter */}
        <filter id="comrGlassCausticsFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Drop shadow filter for 3D effect with softer edges */}
        <filter id="comrShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.45"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Enhanced drop shadow for masses with multiple layers */}
        <filter id="comrMassShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur1"/>
          <feGaussianBlur stdDeviation="3" result="blur2"/>
          <feDropShadow dx="4" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.55"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Soft inner shadow for depth */}
        <filter id="comrInnerShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>

        {/* Inner glow for premium feel */}
        <filter id="comrInnerGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="blur" in2="SourceGraphic" operator="in" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Added weight glow - purple with 4 layers */}
        <filter id="comrGlowPurple" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="9" result="blur1"/>
          <feGaussianBlur stdDeviation="5" result="blur2"/>
          <feGaussianBlur stdDeviation="2" result="blur3"/>
          <feGaussianBlur stdDeviation="0.5" result="blur4"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur3"/>
            <feMergeNode in="blur4"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Connecting structure glow - subtle metallic with 2 layers */}
        <filter id="comrStructureGlow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3" result="blur1"/>
          <feGaussianBlur stdDeviation="1" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Status badge glow */}
        <filter id="comrStatusGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur1"/>
          <feGaussianBlur stdDeviation="2" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Label background blur */}
        <filter id="comrLabelBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Gravity arrow marker with gradient fill */}
        <marker id="comrGravityArrow" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
          <defs>
            <linearGradient id="comrArrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1"/>
              <stop offset="50%" stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#64748b"/>
            </linearGradient>
          </defs>
          <polygon points="0 1, 12 6, 0 11, 3 6" fill="url(#comrArrowGrad)"/>
        </marker>

        {/* Secondary marker for smaller arrows */}
        <marker id="comrArrowSmall" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <polygon points="0 0.5, 8 4, 0 7.5, 2 4" fill="#94a3b8"/>
        </marker>

        {/* Coordinate grid pattern - main */}
        <pattern id="comrGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.35"/>
        </pattern>

        {/* Fine grid pattern - detailed */}
        <pattern id="comrGridFine" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.55"/>
        </pattern>

        {/* Extra fine grid pattern - for precision */}
        <pattern id="comrGridExtraFine" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="none" stroke="#0f172a" strokeWidth="0.2" strokeOpacity="0.4"/>
        </pattern>

        {/* Pivot crosshair pattern */}
        <pattern id="comrCrosshairPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="20" y1="0" x2="20" y2="40" stroke="#22c55e" strokeWidth="0.5" strokeOpacity="0.2"/>
          <line x1="0" y1="20" x2="40" y2="20" stroke="#22c55e" strokeWidth="0.5" strokeOpacity="0.2"/>
        </pattern>
      </defs>

      {/* ============================================================================ */}
      {/* BACKGROUND WITH COORDINATE GRID AND AMBIENT LIGHTING */}
      {/* Premium multi-layer background for depth and atmosphere */}
      {/* ============================================================================ */}
      <rect width={w} height={h} fill="url(#comrBgGrad)"/>
      <rect width={w} height={h} fill="url(#comrBgGradDiag)"/>
      <rect width={w} height={h} fill="url(#comrAmbientLight)"/>
      <rect width={w} height={h} fill="url(#comrAmbientWarm)"/>
      <rect width={w} height={tableY} fill="url(#comrGridExtraFine)" opacity="0.3"/>
      <rect width={w} height={tableY} fill="url(#comrGridFine)" opacity="0.45"/>
      <rect width={w} height={tableY} fill="url(#comrGrid)" opacity="0.65"/>

      {/* Zone overlays - visual indication of stable/unstable regions */}
      <rect x={0} y={0} width={w} height={pivotY} fill="url(#comrUnstableZoneGrad)"/>
      <rect x={0} y={pivotY} width={w} height={tableY - pivotY} fill="url(#comrStableZoneGrad)"/>

      {/* ============================================================================ */}
      {/* PIVOT LEVEL LINE - Horizontal dashed line across screen */}
      {/* Premium styled reference line with glow effect */}
      {/* ============================================================================ */}
      <g opacity="0.7">
        {/* Glow line underneath */}
        <line
          x1={20 * scale}
          y1={pivotY}
          x2={w - 20 * scale}
          y2={pivotY}
          stroke="#22d3ee"
          strokeWidth="6"
          strokeDasharray="12,6"
          opacity="0.2"
          filter="url(#comrGlowGreenSoft)"
        />
        {/* Main reference line */}
        <line
          x1={20 * scale}
          y1={pivotY}
          x2={w - 20 * scale}
          y2={pivotY}
          stroke="url(#comrGlassRimGrad)"
          strokeWidth="2.5"
          strokeDasharray="10,5"
          strokeLinecap="round"
        />
        {/* Subtle highlight on top */}
        <line
          x1={25 * scale}
          y1={pivotY - 1}
          x2={w - 25 * scale}
          y2={pivotY - 1}
          stroke="#a5f3fc"
          strokeWidth="0.5"
          strokeDasharray="10,5"
          opacity="0.4"
        />
      </g>

      {/* ============================================================================ */}
      {/* PREMIUM TABLE WITH WOOD GRAIN AND REFLECTIONS */}
      {/* Multi-layer realistic wood surface */}
      {/* ============================================================================ */}
      <g>
        {/* Table shadow - soft gradient */}
        <rect
          x={0}
          y={tableY + 3}
          width={w}
          height={h - tableY}
          fill="#000000"
          opacity="0.35"
        />
        {/* Main table body with wood grain */}
        <rect
          x={0}
          y={tableY}
          width={w}
          height={h - tableY}
          fill="url(#comrTableGrad)"
        />
        {/* Table surface shine overlay */}
        <rect
          x={0}
          y={tableY}
          width={w}
          height={h - tableY}
          fill="url(#comrTableShine)"
        />
        {/* Table reflection gradient from above */}
        <rect
          x={0}
          y={tableY}
          width={w}
          height={12}
          fill="url(#comrTableReflection)"
        />
        {/* Table top edge highlight */}
        <rect
          x={0}
          y={tableY}
          width={w}
          height={6}
          fill="url(#comrTableEdgeGrad)"
        />
        {/* Primary reflection line */}
        <line
          x1={0}
          y1={tableY + 2}
          x2={w}
          y2={tableY + 2}
          stroke="#fde047"
          strokeWidth="1.5"
          opacity="0.25"
        />
        {/* Secondary subtle reflection */}
        <line
          x1={0}
          y1={tableY + 4}
          x2={w}
          y2={tableY + 4}
          stroke="#fcd34d"
          strokeWidth="0.5"
          opacity="0.15"
        />
      </g>

      {/* ============================================================================ */}
      {/* PREMIUM GLASS (Side View) WITH REALISTIC EFFECTS */}
      {/* Multi-layer glass with caustics, refraction, and shine */}
      {/* ============================================================================ */}
      <g filter="url(#comrGlassShine)">
        {/* Glass shadow on table - soft ellipse */}
        <ellipse
          cx={pivotX}
          cy={tableY + 6}
          rx={30 * scale}
          ry={10 * scale}
          fill="#000000"
          opacity="0.35"
        />
        {/* Secondary softer shadow */}
        <ellipse
          cx={pivotX}
          cy={tableY + 4}
          rx={26 * scale}
          ry={6 * scale}
          fill="#0f172a"
          opacity="0.25"
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
          fill="url(#comrGlassGrad)"
          stroke="url(#comrGlassRimGrad)"
          strokeWidth="2"
        />

        {/* Glass interior depth */}
        <path
          d={`
            M ${pivotX - 25 * scale} ${tableY - 2}
            L ${pivotX - 20 * scale} ${pivotY + 20 * scale}
            Q ${pivotX} ${pivotY + 10 * scale} ${pivotX + 20 * scale} ${pivotY + 20 * scale}
            L ${pivotX + 25 * scale} ${tableY - 2}
            Z
          `}
          fill="url(#comrGlassInterior)"
          opacity="0.6"
        />

        {/* Glass internal caustics overlay */}
        <path
          d={`
            M ${pivotX - 18 * scale} ${tableY - 5}
            Q ${pivotX - 5 * scale} ${pivotY + 40 * scale} ${pivotX + 10 * scale} ${pivotY + 25 * scale}
          `}
          fill="none"
          stroke="url(#comrGlassCaustics)"
          strokeWidth="2"
          opacity="0.6"
          filter="url(#comrGlassCausticsFilter)"
        />

        {/* Glass internal refraction lines - multiple */}
        <path
          d={`
            M ${pivotX - 15 * scale} ${tableY - 10}
            Q ${pivotX - 10 * scale} ${pivotY + 30 * scale} ${pivotX - 8 * scale} ${pivotY + 20 * scale}
          `}
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="1.2"
          opacity="0.35"
        />
        <path
          d={`
            M ${pivotX + 12 * scale} ${tableY - 15}
            Q ${pivotX + 8 * scale} ${pivotY + 35 * scale} ${pivotX + 5 * scale} ${pivotY + 22 * scale}
          `}
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="1"
          opacity="0.28"
        />
        <path
          d={`
            M ${pivotX - 5 * scale} ${tableY - 8}
            Q ${pivotX - 2 * scale} ${pivotY + 28 * scale} ${pivotX} ${pivotY + 18 * scale}
          `}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="0.8"
          opacity="0.2"
        />

        {/* Glass reflection sweep */}
        <path
          d={`
            M ${pivotX - 20 * scale} ${tableY - 5}
            L ${pivotX - 16 * scale} ${pivotY + 25 * scale}
            L ${pivotX - 12 * scale} ${pivotY + 22 * scale}
            L ${pivotX - 16 * scale} ${tableY - 5}
            Z
          `}
          fill="url(#comrGlassReflection)"
          opacity="0.5"
        />

        {/* Glass rim - elliptical top with shine */}
        <ellipse
          cx={pivotX}
          cy={pivotY + 14 * scale}
          rx={22 * scale}
          ry={5 * scale}
          fill="none"
          stroke="url(#comrGlassRimGrad)"
          strokeWidth="3"
        />

        {/* Glass rim inner edge */}
        <ellipse
          cx={pivotX}
          cy={pivotY + 14 * scale}
          rx={19 * scale}
          ry={4 * scale}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="0.5"
          opacity="0.4"
        />

        {/* Glass rim highlight shine - primary */}
        <ellipse
          cx={pivotX - 8 * scale}
          cy={pivotY + 12 * scale}
          rx={9 * scale}
          ry={2.5 * scale}
          fill="#ffffff"
          opacity="0.45"
        />

        {/* Glass rim highlight shine - secondary */}
        <ellipse
          cx={pivotX + 6 * scale}
          cy={pivotY + 15 * scale}
          rx={5 * scale}
          ry={1.5 * scale}
          fill="#a5f3fc"
          opacity="0.3"
        />
      </g>

      {/* ============================================================================ */}
      {/* PREMIUM PIVOT POINT (on glass rim) WITH MULTI-LAYER GLOW */}
      {/* Key physics element - balance point */}
      {/* ============================================================================ */}
      <g filter="url(#comrGlowGreen)">
        {/* Outer aura - large ambient glow */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={22 * scale}
          fill="url(#comrPivotAura)"
          opacity="0.5"
        >
          <animate attributeName="r" values={`${22 * scale};${25 * scale};${22 * scale}`} dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0.35;0.5" dur="3s" repeatCount="indefinite"/>
        </circle>

        {/* Outer glow ring - animated */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={16 * scale}
          fill="none"
          stroke="url(#comrPivotRing)"
          strokeWidth="2"
          opacity="0.6"
        >
          <animate attributeName="r" values={`${16 * scale};${18 * scale};${16 * scale}`} dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.4;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>

        {/* Secondary pulse ring */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={13 * scale}
          fill="none"
          stroke="#4ade80"
          strokeWidth="1.5"
          strokeDasharray="4,3"
          opacity="0.4"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${pivotX} ${pivotY}`}
            to={`360 ${pivotX} ${pivotY}`}
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Main pivot circle */}
        <circle
          cx={pivotX}
          cy={pivotY}
          r={11 * scale}
          fill="url(#comrPivotGrad)"
          stroke="#ffffff"
          strokeWidth="2.5"
        />

        {/* Inner highlight - offset for 3D effect */}
        <circle
          cx={pivotX - 2.5 * scale}
          cy={pivotY - 2.5 * scale}
          r={5 * scale}
          fill="url(#comrPivotInnerGrad)"
        />

        {/* Bright specular highlight */}
        <circle
          cx={pivotX - 3 * scale}
          cy={pivotY - 3 * scale}
          r={2.5 * scale}
          fill="#ffffff"
          opacity="0.8"
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
      {/* THE BALANCING BEAM SYSTEM WITH PREMIUM 3D EFFECTS */}
      {/* Main physics element - the lever/beam with realistic shadows */}
      {/* ============================================================================ */}
      <g
        transform={`translate(${pivotX}, ${pivotY}) rotate(${totalAngle})`}
        filter="url(#comrShadow)"
      >
        {/* Beam deep shadow underneath */}
        <rect
          x={-124 * scale}
          y={4 * scale}
          width={248 * scale}
          height={14 * scale}
          rx={7 * scale}
          fill="#000000"
          opacity="0.25"
        />
        {/* Beam shadow - closer */}
        <rect
          x={-122 * scale}
          y={2 * scale}
          width={244 * scale}
          height={12 * scale}
          rx={6 * scale}
          fill="#0f172a"
          opacity="0.35"
        />

        {/* Main beam with premium brushed metal */}
        <rect
          x={-120 * scale}
          y={-6 * scale}
          width={240 * scale}
          height={12 * scale}
          rx={6 * scale}
          fill="url(#comrBeamGrad)"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Beam depth overlay */}
        <rect
          x={-120 * scale}
          y={-6 * scale}
          width={240 * scale}
          height={12 * scale}
          rx={6 * scale}
          fill="url(#comrBeamDepth)"
        />

        {/* Beam bottom shadow gradient */}
        <rect
          x={-118 * scale}
          y={2 * scale}
          width={236 * scale}
          height={4 * scale}
          rx={2 * scale}
          fill="url(#comrBeamShadow)"
          opacity="0.5"
        />

        {/* Beam top shine line - primary */}
        <rect
          x={-115 * scale}
          y={-5 * scale}
          width={230 * scale}
          height={2.5 * scale}
          rx={1.25 * scale}
          fill="url(#comrBeamShineGrad)"
          opacity="0.75"
        />

        {/* Beam top shine line - secondary highlight */}
        <rect
          x={-100 * scale}
          y={-4.5 * scale}
          width={200 * scale}
          height={1 * scale}
          rx={0.5 * scale}
          fill="#ffffff"
          opacity="0.3"
        />

        {/* ============================================================================ */}
        {/* LEFT SIDE: HEAVY WEIGHT (fork side) - REALISTIC 3D SPHERE */}
        {/* Premium spherical mass with multiple highlight layers and depth */}
        {/* ============================================================================ */}
        <g transform={`translate(${-85 * scale}, 0)`} filter="url(#comrMassShadow)">
          {/* Ground shadow ellipse - soft outer */}
          <ellipse
            cx={0}
            cy={87 * scale}
            rx={32 * scale}
            ry={10 * scale}
            fill="#000000"
            opacity="0.25"
          />
          {/* Ground shadow ellipse - core */}
          <ellipse
            cx={0}
            cy={85 * scale}
            rx={26 * scale}
            ry={7 * scale}
            fill="#0f172a"
            opacity="0.4"
          />

          {/* Connecting rod from beam to mass */}
          <g filter="url(#comrStructureGlow)">
            {/* Rod shadow */}
            <rect
              x={-2 * scale}
              y={7 * scale}
              width={6 * scale}
              height={28 * scale}
              rx={2 * scale}
              fill="url(#comrConnectingRodShadow)"
              opacity="0.4"
            />
            {/* Main rod */}
            <rect
              x={-3 * scale}
              y={6 * scale}
              width={6 * scale}
              height={28 * scale}
              rx={2 * scale}
              fill="url(#comrConnectingRod)"
              stroke="#475569"
              strokeWidth="1"
            />
            {/* Rod highlight */}
            <rect
              x={-1.2 * scale}
              y={8 * scale}
              width={2.4 * scale}
              height={24 * scale}
              rx={1 * scale}
              fill="url(#comrConnectingRodHighlight)"
              opacity="0.65"
            />
          </g>

          {/* Main heavy mass sphere - 3D effect with gradient */}
          <circle
            cx={0}
            cy={58 * scale}
            r={32 * scale}
            fill="url(#comrHeavyMassSphere)"
            stroke="#92400e"
            strokeWidth="2"
          />

          {/* Sphere depth overlay */}
          <circle
            cx={0}
            cy={58 * scale}
            r={31 * scale}
            fill="url(#comrHeavyMassDepth)"
          />

          {/* Sphere ambient occlusion - bottom shadow */}
          <circle
            cx={0}
            cy={58 * scale}
            r={30 * scale}
            fill="url(#comrHeavyMassAO)"
          />

          {/* Sphere rim light - edge highlight */}
          <circle
            cx={0}
            cy={58 * scale}
            r={30 * scale}
            fill="none"
            stroke="url(#comrHeavyMassRim)"
            strokeWidth="2.5"
          />

          {/* Primary specular highlight - main light reflection */}
          <ellipse
            cx={-10 * scale}
            cy={44 * scale}
            rx={13 * scale}
            ry={11 * scale}
            fill="url(#comrHeavyMassSpecular)"
          />

          {/* Secondary specular highlight - bright point */}
          <circle
            cx={-7 * scale}
            cy={40 * scale}
            r={6 * scale}
            fill="#ffffff"
            opacity="0.75"
          />

          {/* Tertiary highlight - small accent */}
          <circle
            cx={-4 * scale}
            cy={38 * scale}
            r={2.5 * scale}
            fill="#ffffff"
            opacity="0.9"
          />

          {/* Weight label embossed with shadow */}
          <text
            x={0.5 * scale}
            y={64 * scale}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#451a03"
            fontSize={13 * scale}
            fontFamily="system-ui"
            fontWeight="800"
            opacity="0.4"
          >
            M
          </text>
          <text
            x={0}
            y={63 * scale}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#78350f"
            fontSize={13 * scale}
            fontFamily="system-ui"
            fontWeight="800"
          >
            M
          </text>
        </g>

        {/* ============================================================================ */}
        {/* RIGHT SIDE: LIGHT END - REALISTIC 3D SPHERE (smaller mass) */}
        {/* Premium spherical mass with specular highlights */}
        {/* ============================================================================ */}
        <g transform={`translate(${85 * scale}, 0)`} filter="url(#comrMassSphereGlow)">
          {/* Ground shadow ellipse - soft outer */}
          <ellipse
            cx={0}
            cy={54 * scale}
            rx={16 * scale}
            ry={5 * scale}
            fill="#000000"
            opacity="0.2"
          />
          {/* Ground shadow ellipse - core */}
          <ellipse
            cx={0}
            cy={52 * scale}
            rx={12 * scale}
            ry={3.5 * scale}
            fill="#0f172a"
            opacity="0.35"
          />

          {/* Connecting rod from beam to mass */}
          <g filter="url(#comrStructureGlow)">
            {/* Rod shadow */}
            <rect
              x={-1.5 * scale}
              y={7 * scale}
              width={5 * scale}
              height={18 * scale}
              rx={2 * scale}
              fill="url(#comrConnectingRodShadow)"
              opacity="0.3"
            />
            {/* Main rod */}
            <rect
              x={-2.5 * scale}
              y={6 * scale}
              width={5 * scale}
              height={18 * scale}
              rx={2 * scale}
              fill="url(#comrConnectingRod)"
              stroke="#475569"
              strokeWidth="1"
            />
            {/* Rod highlight */}
            <rect
              x={-0.9 * scale}
              y={8 * scale}
              width={1.8 * scale}
              height={14 * scale}
              rx={0.6 * scale}
              fill="url(#comrConnectingRodHighlight)"
              opacity="0.55"
            />
          </g>

          {/* Main light mass sphere - 3D effect */}
          <circle
            cx={0}
            cy={38 * scale}
            r={18 * scale}
            fill="url(#comrLightEndGrad)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Sphere depth overlay */}
          <circle
            cx={0}
            cy={38 * scale}
            r={17 * scale}
            fill="url(#comrLightEndDepth)"
          />

          {/* Sphere rim light */}
          <circle
            cx={0}
            cy={38 * scale}
            r={16.5 * scale}
            fill="none"
            stroke="url(#comrLightEndRim)"
            strokeWidth="1.5"
          />

          {/* Primary specular highlight */}
          <ellipse
            cx={-5 * scale}
            cy={29 * scale}
            rx={8 * scale}
            ry={7 * scale}
            fill="url(#comrLightEndSpecular)"
          />

          {/* Secondary specular - bright point */}
          <circle
            cx={-4 * scale}
            cy={27 * scale}
            r={3.5 * scale}
            fill="#ffffff"
            opacity="0.65"
          />

          {/* Tertiary highlight */}
          <circle
            cx={-3 * scale}
            cy={25 * scale}
            r={1.5 * scale}
            fill="#ffffff"
            opacity="0.85"
          />

          {/* Weight label with shadow */}
          <text
            x={0.3 * scale}
            y={42.5 * scale}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#0f172a"
            fontSize={11 * scale}
            fontFamily="system-ui"
            fontWeight="700"
            opacity="0.35"
          >
            m
          </text>
          <text
            x={0}
            y={42 * scale}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#1e293b"
            fontSize={11 * scale}
            fontFamily="system-ui"
            fontWeight="700"
          >
            m
          </text>
        </g>

        {/* ============================================================================ */}
        {/* ADDED WEIGHT (if present) - REALISTIC 3D CLAY/SPHERE */}
        {/* Premium spherical mass with distinctive purple glow and aura */}
        {/* ============================================================================ */}
        {hasWeight && (
          <g transform={`translate(${weightPosition * 80 * scale}, 0)`} filter="url(#comrGlowPurple)">
            {/* Outer aura glow */}
            <circle
              cx={0}
              cy={-26 * scale}
              r={28 * scale}
              fill="url(#comrAddedWeightAura)"
              opacity="0.6"
            >
              <animate attributeName="r" values={`${28 * scale};${32 * scale};${28 * scale}`} dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.4;0.6" dur="2s" repeatCount="indefinite"/>
            </circle>

            {/* Added weight shadow on beam */}
            <ellipse
              cx={0}
              cy={-5 * scale}
              rx={18 * scale}
              ry={6 * scale}
              fill="#000000"
              opacity="0.3"
            />

            {/* Connecting pin to beam */}
            <rect
              x={-2.5 * scale}
              y={-13 * scale}
              width={5 * scale}
              height={12 * scale}
              rx={2 * scale}
              fill="url(#comrConnectingRod)"
              stroke="#475569"
              strokeWidth="0.75"
            />
            {/* Pin highlight */}
            <rect
              x={-0.8 * scale}
              y={-11 * scale}
              width={1.6 * scale}
              height={8 * scale}
              rx={0.5 * scale}
              fill="url(#comrConnectingRodHighlight)"
              opacity="0.5"
            />

            {/* Main added weight sphere - 3D effect */}
            <circle
              cx={0}
              cy={-26 * scale}
              r={18 * scale}
              fill="url(#comrAddedWeightGrad)"
              stroke="#7c3aed"
              strokeWidth="2"
            />

            {/* Sphere depth overlay */}
            <circle
              cx={0}
              cy={-26 * scale}
              r={17 * scale}
              fill="url(#comrAddedWeightDepth)"
            />

            {/* Sphere ambient occlusion ring */}
            <circle
              cx={0}
              cy={-26 * scale}
              r={16 * scale}
              fill="none"
              stroke="#6d28d9"
              strokeWidth="1.5"
              opacity="0.35"
            />

            {/* Animated energy ring */}
            <circle
              cx={0}
              cy={-26 * scale}
              r={20 * scale}
              fill="none"
              stroke="#a855f7"
              strokeWidth="1"
              strokeDasharray="6,4"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 -26"
                to="-360 0 -26"
                dur="6s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Primary specular highlight */}
            <ellipse
              cx={-6 * scale}
              cy={-34 * scale}
              rx={9 * scale}
              ry={7 * scale}
              fill="url(#comrAddedWeightSpecular)"
            />

            {/* Secondary specular - bright point */}
            <circle
              cx={-5 * scale}
              cy={-35 * scale}
              r={4.5 * scale}
              fill="#ffffff"
              opacity="0.75"
            />

            {/* Tertiary highlight - small accent */}
            <circle
              cx={-3 * scale}
              cy={-37 * scale}
              r={2 * scale}
              fill="#ffffff"
              opacity="0.9"
            />

            {/* Subtle rim highlight */}
            <circle
              cx={4 * scale}
              cy={-18 * scale}
              r={2.5 * scale}
              fill="#e9d5ff"
              opacity="0.45"
            />

            {/* Plus symbol with shadow */}
            <text
              x={0.5 * scale}
              y={-24.5 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#4c1d95"
              fontSize={17 * scale}
              fontFamily="system-ui"
              fontWeight="800"
              opacity="0.35"
            >
              +
            </text>
            <text
              x={0}
              y={-26 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={17 * scale}
              fontFamily="system-ui"
              fontWeight="800"
            >
              +
            </text>
          </g>
        )}

        {/* ============================================================================ */}
        {/* CENTER OF MASS INDICATOR - DISTINCTIVE PREMIUM GLOW */}
        {/* Key physics indicator - multiple layers for professional appearance */}
        {/* ============================================================================ */}
        {showCOM && (
          <g
            transform={`translate(0, ${comYPixels})`}
            filter="url(#comrGlowRedIntense)"
          >
            {/* Vertical connecting line from beam to COM - shadow */}
            <line
              x1={1}
              y1={1}
              x2={1}
              y2={-comYPixels + 1}
              stroke="#7f1d1d"
              strokeWidth="3.5"
              strokeDasharray="6,4"
              opacity="0.25"
            />
            {/* Vertical connecting line - main */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-comYPixels}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="6,4"
              opacity="0.85"
            />
            {/* Vertical connecting line - highlight */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-comYPixels}
              stroke="#fca5a5"
              strokeWidth="1"
              strokeDasharray="6,4"
              opacity="0.55"
            />

            {/* Outer aura - secondary layer */}
            <circle
              r={40 * scale}
              fill="url(#comrCOMAura2)"
              opacity="0.5"
            >
              <animate attributeName="r" values={`${40 * scale};${45 * scale};${40 * scale}`} dur="3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0.3;0.5" dur="3s" repeatCount="indefinite"/>
            </circle>

            {/* Outer aura - large pulsing glow */}
            <circle
              r={32 * scale}
              fill="url(#comrCOMAura)"
              opacity="0.65"
            >
              <animate attributeName="r" values={`${32 * scale};${36 * scale};${32 * scale}`} dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.65;0.45;0.65" dur="2s" repeatCount="indefinite"/>
            </circle>

            {/* Outer animated ring - dashed rotating */}
            <circle
              r={28 * scale}
              fill="none"
              stroke="url(#comrCOMRingGrad)"
              strokeWidth="2.5"
              strokeDasharray="12,6"
              opacity="0.85"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="5s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Energy ring gradient */}
            <circle
              r={24 * scale}
              fill="none"
              stroke="url(#comrCOMEnergyRing)"
              strokeWidth="3"
              opacity="0.6"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="-360 0 0"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Secondary pulsing ring */}
            <circle
              r={20 * scale}
              fill="none"
              stroke="#f87171"
              strokeWidth="1.5"
              opacity="0.65"
            >
              <animate attributeName="r" values={`${20 * scale};${23 * scale};${20 * scale}`} dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.65;0.35;0.65" dur="1.5s" repeatCount="indefinite"/>
            </circle>

            {/* Inner ring - counter-rotating */}
            <circle
              r={17 * scale}
              fill="none"
              stroke="#fca5a5"
              strokeWidth="1.2"
              strokeDasharray="5,3"
              opacity="0.55"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="360 0 0"
                to="0 0 0"
                dur="7s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Main COM circle with premium gradient */}
            <circle
              r={14 * scale}
              fill="url(#comrCOMGrad)"
              stroke="#ffffff"
              strokeWidth="3"
            />

            {/* Core inner glow */}
            <circle
              r={11 * scale}
              fill="url(#comrCOMCore)"
              opacity="0.75"
            />

            {/* Primary specular highlight */}
            <ellipse
              cx={-4 * scale}
              cy={-4 * scale}
              rx={6 * scale}
              ry={5 * scale}
              fill="#ffffff"
              opacity="0.65"
            />

            {/* Secondary specular - bright point */}
            <circle
              cx={-3 * scale}
              cy={-3.5 * scale}
              r={2.5 * scale}
              fill="#ffffff"
              opacity="0.9"
            />

            {/* Tertiary highlight */}
            <circle
              cx={-2 * scale}
              cy={-2.5 * scale}
              r={1 * scale}
              fill="#ffffff"
            />

            {/* Diamond highlight streak */}
            <rect
              x={-2 * scale}
              y={-9 * scale}
              width={4 * scale}
              height={6 * scale}
              rx={1.5 * scale}
              fill="url(#comrCOMDiamond)"
              transform="rotate(-45)"
              opacity="0.55"
            />

            {/* Crosshair - shadow layer */}
            <line x1={-11 * scale} y1={0.5 * scale} x2={11 * scale} y2={0.5 * scale} stroke="#7f1d1d" strokeWidth="3.5" strokeLinecap="round" opacity="0.25"/>
            <line x1={0.5 * scale} y1={-11 * scale} x2={0.5 * scale} y2={11 * scale} stroke="#7f1d1d" strokeWidth="3.5" strokeLinecap="round" opacity="0.25"/>
            {/* Crosshair - main */}
            <line x1={-10 * scale} y1={0} x2={10 * scale} y2={0} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1={0} y1={-10 * scale} x2={0} y2={10 * scale} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>

            {/* Center dot with glow */}
            <circle
              r={3 * scale}
              fill="#fef2f2"
              opacity="0.5"
            />
            <circle
              r={2 * scale}
              fill="#ffffff"
            />
          </g>
        )}
      </g>

      {/* ============================================================================ */}
      {/* GRAVITY ARROW WITH PREMIUM STYLING */}
      {/* Professional physics notation with gradient and glow */}
      {/* ============================================================================ */}
      <g transform={`translate(${55 * scale}, ${pivotY + 25 * scale})`}>
        {/* Arrow shadow */}
        <line
          x1={1}
          y1={1}
          x2={1}
          y2={46 * scale}
          stroke="#0f172a"
          strokeWidth="5"
          opacity="0.3"
        />
        {/* Main arrow shaft */}
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={45 * scale}
          stroke="#94a3b8"
          strokeWidth="3.5"
          markerEnd="url(#comrGravityArrow)"
        />
        {/* Arrow highlight */}
        <line
          x1={-0.5}
          y1={2}
          x2={-0.5}
          y2={40 * scale}
          stroke="#cbd5e1"
          strokeWidth="1"
          opacity="0.4"
        />
        {/* Label background for legibility */}
        <rect
          x={10 * scale}
          y={16 * scale}
          width={22 * scale}
          height={20 * scale}
          rx={4}
          fill="rgba(15, 23, 42, 0.6)"
        />
        {/* Label shadow */}
        <text
          x={21.5 * scale}
          y={31 * scale}
          fill="#0f172a"
          fontSize={14 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          fontStyle="italic"
          textAnchor="middle"
          opacity="0.5"
        >
          g
        </text>
        {/* Main label */}
        <text
          x={21 * scale}
          y={30 * scale}
          fill="#cbd5e1"
          fontSize={14 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          fontStyle="italic"
          textAnchor="middle"
        >
          g
        </text>
      </g>

      {/* ============================================================================ */}
      {/* LABELS - Professional labeling for educational clarity */}
      {/* Premium styled labels with backgrounds and connectors */}
      {/* ============================================================================ */}

      {/* Pivot point label */}
      <g transform={`translate(${pivotX + 25 * scale}, ${pivotY - 28 * scale})`} filter="url(#comrLabelBlur)">
        {/* Label shadow */}
        <rect
          x={0}
          y={-8 * scale}
          width={52 * scale}
          height={20 * scale}
          rx={5}
          fill="rgba(0, 0, 0, 0.4)"
        />
        {/* Label background */}
        <rect
          x={-2 * scale}
          y={-10 * scale}
          width={52 * scale}
          height={20 * scale}
          rx={5}
          fill="rgba(20, 83, 45, 0.7)"
          stroke="#22c55e"
          strokeWidth="1.5"
        />
        {/* Label text */}
        <text
          x={24 * scale}
          y={3 * scale}
          textAnchor="middle"
          fill="#4ade80"
          fontSize={11 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          letterSpacing="0.5"
        >
          PIVOT
        </text>
        {/* Arrow pointing to pivot */}
        <line
          x1={-5 * scale}
          y1={0}
          x2={-22 * scale}
          y2={20 * scale}
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeDasharray="4,2"
          opacity="0.75"
          markerEnd="url(#comrArrowSmall)"
        />
      </g>

      {/* Heavy mass label - outside the rotating group */}
      <g transform={`translate(${pivotX - 85 * scale}, ${pivotY + 100 * scale})`} filter="url(#comrLabelBlur)">
        {/* Label shadow */}
        <rect
          x={-30 * scale}
          y={-8 * scale}
          width={62 * scale}
          height={20 * scale}
          rx={5}
          fill="rgba(0, 0, 0, 0.4)"
        />
        {/* Label background */}
        <rect
          x={-32 * scale}
          y={-10 * scale}
          width={64 * scale}
          height={20 * scale}
          rx={5}
          fill="rgba(120, 53, 15, 0.65)"
          stroke="#f59e0b"
          strokeWidth="1.5"
        />
        {/* Label text */}
        <text
          x={0}
          y={3 * scale}
          textAnchor="middle"
          fill="#fcd34d"
          fontSize={9 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          letterSpacing="0.5"
        >
          HEAVY MASS
        </text>
      </g>

      {/* Light mass label */}
      <g transform={`translate(${pivotX + 85 * scale}, ${pivotY + 68 * scale})`} filter="url(#comrLabelBlur)">
        {/* Label shadow */}
        <rect
          x={-28 * scale}
          y={-8 * scale}
          width={58 * scale}
          height={20 * scale}
          rx={5}
          fill="rgba(0, 0, 0, 0.4)"
        />
        {/* Label background */}
        <rect
          x={-30 * scale}
          y={-10 * scale}
          width={60 * scale}
          height={20 * scale}
          rx={5}
          fill="rgba(51, 65, 85, 0.7)"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        {/* Label text */}
        <text
          x={0}
          y={3 * scale}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          letterSpacing="0.5"
        >
          LIGHT MASS
        </text>
      </g>

      {/* COM label - only when shown */}
      {showCOM && (
        <g transform={`translate(${pivotX + 45 * scale}, ${pivotY + comYPixels - 5 * scale})`} filter="url(#comrLabelBlur)">
          {/* Label shadow */}
          <rect
            x={0}
            y={-8 * scale}
            width={82 * scale}
            height={20 * scale}
            rx={5}
            fill="rgba(0, 0, 0, 0.4)"
          />
          {/* Label background */}
          <rect
            x={-2 * scale}
            y={-10 * scale}
            width={82 * scale}
            height={20 * scale}
            rx={5}
            fill="rgba(127, 29, 29, 0.7)"
            stroke="#ef4444"
            strokeWidth="1.5"
          />
          {/* Label text */}
          <text
            x={39 * scale}
            y={3 * scale}
            textAnchor="middle"
            fill="#f87171"
            fontSize={9 * scale}
            fontFamily="system-ui"
            fontWeight="700"
            letterSpacing="0.5"
          >
            CENTER OF MASS
          </text>
          {/* Arrow pointing to COM */}
          <line
            x1={-5 * scale}
            y1={0}
            x2={-35 * scale}
            y2={0}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4,2"
            opacity="0.8"
          />
        </g>
      )}

      {/* ============================================================================ */}
      {/* STATUS DISPLAY - Premium card style with glow effects */}
      {/* Main status indicator for balance state */}
      {/* ============================================================================ */}
      <g transform={`translate(${w - 155 * scale}, ${10 * scale})`} filter="url(#comrStatusGlow)">
        {/* Card shadow */}
        <rect
          x={3}
          y={3}
          width={145 * scale}
          height={64 * scale}
          rx={12}
          fill="rgba(0, 0, 0, 0.35)"
        />
        {/* Main card background */}
        <rect
          width={145 * scale}
          height={64 * scale}
          rx={12}
          fill={isBalanced ? 'rgba(20, 83, 45, 0.55)' : 'rgba(127, 29, 29, 0.55)'}
          stroke={isBalanced ? '#22c55e' : '#ef4444'}
          strokeWidth="2"
        />
        {/* Status gradient overlay - top highlight */}
        <rect
          width={145 * scale}
          height={22 * scale}
          rx={12}
          fill={isBalanced ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
        />
        {/* Inner glow indicator */}
        <circle
          cx={72 * scale}
          cy={32 * scale}
          r={50 * scale}
          fill={isBalanced ? 'url(#comrStableGlow)' : 'url(#comrUnstableGlow)'}
          opacity="0.3"
        />
        {/* Status indicator dot */}
        <circle
          cx={18 * scale}
          cy={22 * scale}
          r={5 * scale}
          fill={isBalanced ? '#4ade80' : '#f87171'}
        >
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        {/* Main status text */}
        <text
          x={78 * scale}
          y={24 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#4ade80' : '#f87171'}
          fontSize={17 * scale}
          fontFamily="system-ui"
          fontWeight="800"
          letterSpacing="1"
        >
          {isBalanced ? 'BALANCED' : 'FALLING'}
        </text>
        {/* Status description */}
        <text
          x={72 * scale}
          y={42 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#86efac' : '#fca5a5'}
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          {comY < 0 ? 'COM is BELOW pivot' : 'COM is ABOVE pivot'}
        </text>
        {/* Physics explanation */}
        <text
          x={72 * scale}
          y={55 * scale}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={8 * scale}
          fontFamily="system-ui"
          fontStyle="italic"
        >
          {comY < 0 ? 'gravity restores balance' : 'gravity tips it over'}
        </text>
      </g>

      {/* ============================================================================ */}
      {/* PHYSICS FORMULA NOTATION - Professional equation display */}
      {/* Educational reference for stability condition */}
      {/* ============================================================================ */}
      <g transform={`translate(${12 * scale}, ${12 * scale})`}>
        {/* Formula background */}
        <rect
          width={85 * scale}
          height={32 * scale}
          rx={6}
          fill="rgba(15, 23, 42, 0.75)"
          stroke="#334155"
          strokeWidth="1"
        />
        {/* Stability condition */}
        <text
          x={42 * scale}
          y={15 * scale}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={8 * scale}
          fontFamily="system-ui"
          fontWeight="600"
        >
          Stability Condition:
        </text>
        <text
          x={42 * scale}
          y={26 * scale}
          textAnchor="middle"
          fill={isBalanced ? '#4ade80' : '#f87171'}
          fontSize={10 * scale}
          fontFamily="system-ui"
          fontWeight="700"
          fontStyle="italic"
        >
          y_COM {comY < 0 ? '<' : '>'} y_pivot
        </text>
      </g>
    </svg>
  );
};

export default CenterOfMassVisualization;
