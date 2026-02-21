import React from 'react';
import { theme, withOpacity } from './theme';

// ─── SVG Filter & Gradient Generators (for use inside <defs>) ───

/** Gaussian blur + feMerge glow effect */
export function glowFilter(id: string, color: string, radius: number = 4) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation={radius} result="blur" />
      <feFlood floodColor={color} floodOpacity="0.6" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
      <feMerge>
        <feMergeNode in="colorBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/** Multi-pass blur for light bloom */
export function bloomFilter(id: string) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur3" />
      <feMerge>
        <feMergeNode in="blur3" />
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/** 3-stop linear gradient for metallic surfaces */
export function metallicGradient(id: string, baseColor: string) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor={baseColor} stopOpacity="1" />
      <stop offset="50%" stopColor={withOpacity(baseColor, 0.6)} stopOpacity="1" />
      <stop offset="100%" stopColor={baseColor} stopOpacity="0.8" />
    </linearGradient>
  );
}

/** Semi-transparent layered gradient for glass effect */
export function glassGradient(id: string) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
      <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
      <stop offset="60%" stopColor="#000000" stopOpacity="0.05" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
    </linearGradient>
  );
}

/** Repeating grid background pattern */
export function gridPattern(id: string, spacing: number = 20) {
  return (
    <pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
      <path
        d={`M ${spacing} 0 L 0 0 0 ${spacing}`}
        fill="none"
        stroke={withOpacity(theme.colors.border, 0.3)}
        strokeWidth="0.5"
      />
    </pattern>
  );
}

/** Depth gradient for fluid/water simulations */
export function waterGradient(id: string) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
      <stop offset="50%" stopColor="#0369a1" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.9" />
    </linearGradient>
  );
}

// ─── Standard defs bundle — inject once per SVG ───

interface SvgDefsProps {
  /** Include glow filter with this color (default: accent) */
  glowColor?: string;
  /** Include grid pattern */
  grid?: boolean;
  gridSpacing?: number;
  /** Include water gradient */
  water?: boolean;
  /** Prefix for IDs to avoid collisions (default: 'shared') */
  prefix?: string;
}

export function SvgDefs({
  glowColor = theme.colors.accent,
  grid = false,
  gridSpacing = 20,
  water = false,
  prefix = 'shared',
}: SvgDefsProps) {
  return (
    <defs>
      {glowFilter(`${prefix}-glow`, glowColor)}
      {bloomFilter(`${prefix}-bloom`)}
      {metallicGradient(`${prefix}-metallic`, theme.colors.borderLight)}
      {glassGradient(`${prefix}-glass`)}
      {grid && gridPattern(`${prefix}-grid`, gridSpacing)}
      {water && waterGradient(`${prefix}-water`)}
    </defs>
  );
}

// ─── Annotation: educational callout with curved arrow + label ───

interface AnnotationProps {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  label: string;
  color?: string;
  fontSize?: number;
}

export function Annotation({
  x,
  y,
  targetX,
  targetY,
  label,
  color = theme.colors.accent,
  fontSize = theme.fontSize.sm,
}: AnnotationProps) {
  const midX = (x + targetX) / 2;
  const midY = Math.min(y, targetY) - 20;
  const path = `M ${targetX} ${targetY} Q ${midX} ${midY} ${x} ${y}`;
  const textWidth = label.length * fontSize * 0.55;
  const pad = 6;

  return (
    <g>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" markerEnd={`url(#anno-arrow-${color.replace('#', '')})`} />
      <defs>
        <marker id={`anno-arrow-${color.replace('#', '')}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill={color} />
        </marker>
      </defs>
      <rect x={x - textWidth / 2 - pad} y={y - fontSize / 2 - pad} width={textWidth + pad * 2} height={fontSize + pad * 2} rx="4" fill={withOpacity(color, 0.15)} stroke={color} strokeWidth="0.5" />
      <text x={x} y={y + fontSize * 0.35} textAnchor="middle" fill={color} fontSize={fontSize} fontFamily={theme.fontFamily}>
        {label}
      </text>
    </g>
  );
}

// ─── Legend: color-coded key ───

interface LegendItem {
  color: string;
  label: string;
}

interface LegendProps {
  items: LegendItem[];
  x: number;
  y: number;
  fontSize?: number;
}

export function Legend({ items, x, y, fontSize = theme.fontSize.sm }: LegendProps) {
  const rowHeight = fontSize + 8;
  return (
    <g>
      {items.map((item, i) => (
        <g key={i} transform={`translate(${x}, ${y + i * rowHeight})`}>
          <rect width={fontSize} height={fontSize} rx="2" fill={item.color} />
          <text x={fontSize + 6} y={fontSize - 2} fill={theme.colors.textSecondary} fontSize={fontSize} fontFamily={theme.fontFamily}>
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// ─── FormulaDisplay: equation with highlighted variables ───

interface FormulaVariable {
  name: string;
  value: number | string;
  unit: string;
  highlight?: string;
}

interface FormulaDisplayProps {
  formula: string;
  variables: FormulaVariable[];
  x: number;
  y: number;
  fontSize?: number;
}

export function FormulaDisplay({
  formula,
  variables,
  x,
  y,
  fontSize = theme.fontSize.base,
}: FormulaDisplayProps) {
  const lineHeight = fontSize + 6;
  return (
    <g>
      <text x={x} y={y} fill={theme.colors.textPrimary} fontSize={fontSize + 2} fontFamily={theme.fontFamily} fontWeight="600">
        {formula}
      </text>
      {variables.map((v, i) => (
        <text key={i} x={x} y={y + (i + 1) * lineHeight} fontSize={fontSize} fontFamily={theme.fontFamily}>
          <tspan fill={v.highlight || theme.colors.textMuted}>{v.name}</tspan>
          <tspan fill={theme.colors.textSecondary}> = {v.value} {v.unit}</tspan>
        </text>
      ))}
    </g>
  );
}

// ─── ValueBadge: numeric display with unit ───

interface ValueBadgeProps {
  value: number | string;
  unit: string;
  label: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
}

export function ValueBadge({
  value,
  unit,
  label,
  x,
  y,
  color = theme.colors.accent,
  fontSize = theme.fontSize.base,
}: ValueBadgeProps) {
  const displayText = `${label} = ${value} ${unit}`;
  const textWidth = displayText.length * fontSize * 0.55;
  const pad = 8;
  const height = fontSize + pad * 2;
  const width = textWidth + pad * 2;

  return (
    <g>
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx="6" fill={withOpacity(color, 0.15)} stroke={color} strokeWidth="1" />
      <text x={x} y={y + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} fontFamily={theme.fontFamily} fontWeight="600">
        <tspan fill={theme.colors.textSecondary}>{label} = </tspan>
        <tspan fill={color}>{value}</tspan>
        <tspan fill={theme.colors.textMuted}> {unit}</tspan>
      </text>
    </g>
  );
}
