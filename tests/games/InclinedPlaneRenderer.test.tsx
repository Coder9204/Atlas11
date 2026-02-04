import InclinedPlaneRenderer from '../../components/InclinedPlaneRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import React from 'react';
import { clearConsoleLogs } from '../setup';

createGameTestSuite('InclinedPlaneRenderer', InclinedPlaneRenderer);

describe('InclinedPlane - Specific Quality', () => {
  beforeEach(() => {
    cleanup();
    clearConsoleLogs();
  });

  it('SVG uses viewBox for responsive scaling', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const viewBox = svg?.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
    // viewBox should have 4 numeric parts
    const parts = (viewBox || '').split(/[\s,]+/);
    expect(parts.length).toBe(4);
  });

  it('play phase shows experiment count progress (N/3)', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const content = document.body.textContent || '';
    // Should show progress like "0 / 3" or "0/3" or "Experiments: 0 / 3"
    expect(content).toMatch(/\d+\s*\/\s*3/);
  });

  it('play phase has acceleration vs angle data graph (2+ SVGs)', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const svgs = document.querySelectorAll('svg');
    // Should have at least 2 SVGs: the simulation and the acceleration graph
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('vector legend explains physical meaning of each force', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const content = document.body.textContent || '';
    // Legend should explain what forces mean, not just label them
    expect(content).toMatch(/gravity|pulling|straight down/i);
    expect(content).toMatch(/perpendicular|surface|pushes/i);
    expect(content).toMatch(/drives|acceleration|down.*ramp|parallel/i);
  });
});
