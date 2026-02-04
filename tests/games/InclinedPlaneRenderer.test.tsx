import InclinedPlaneRenderer from '../../components/InclinedPlaneRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
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

describe('InclinedPlane - UX Usability', () => {
  beforeEach(() => {
    cleanup();
    clearConsoleLogs();
  });

  it('angle slider is enabled and changing it updates displayed angle value', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);

    const slider = sliders[0] as HTMLInputElement;
    // Slider must NOT be disabled by default
    expect(slider.disabled).toBe(false);

    // Read current displayed angle
    const textBefore = document.body.textContent || '';
    // Change slider to a different value
    fireEvent.change(slider, { target: { value: '45' } });
    const textAfter = document.body.textContent || '';

    // The displayed angle value should change
    expect(textAfter).not.toBe(textBefore);
    // Should display "45" somewhere as the new angle
    expect(textAfter).toContain('45');
  });

  it('continue button is enabled immediately without experiment gate', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);

    // Find the continue/advance button
    const buttons = screen.getAllByRole('button');
    const continueBtn = buttons.find(btn => {
      const text = btn.textContent?.trim() || '';
      return /understand|proceed|review|ready|advance|discover|physics|continue/i.test(text);
    });

    if (continueBtn) {
      const el = continueBtn as HTMLElement;
      // Should NOT be disabled — no experiment gate
      expect(el.hasAttribute('disabled')).toBe(false);
      expect(el.style.opacity).not.toBe('0.4');
      expect(el.style.cursor).not.toBe('not-allowed');
    }
  });

  it('play phase does not require multiple experiments to continue', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const content = document.body.textContent || '';

    // Should NOT show "3 more experiments" or "0 / 3" progress gates
    expect(content).not.toMatch(/\d+\s*more\s*experiment/i);
    expect(content).not.toMatch(/0\s*\/\s*3/);
  });

  it('transfer phase last app has exactly one forward-navigation button', () => {
    render(<InclinedPlaneRenderer gamePhase="transfer" />);

    // Click through all 4 app tabs to reach the last one
    const allButtons = screen.getAllByRole('button');
    const appButtons = allButtons.filter(btn => {
      const text = btn.textContent?.trim() || '';
      return text.length > 2 && text.length < 50
        && !(/← back|next →|back|prev|continue|test|knowledge/i.test(text));
    });
    // Click the last app tab
    if (appButtons.length >= 4) {
      fireEvent.click(appButtons[3]);
    }

    // Also click "Next Application →" buttons to reach the end
    for (let i = 0; i < 4; i++) {
      const nextAppBtn = screen.getAllByRole('button').find(btn =>
        /next.*application/i.test(btn.textContent?.trim() || '')
      );
      if (nextAppBtn) fireEvent.click(nextAppBtn);
    }

    // Now on last app — count enabled forward-to-test buttons
    const currentButtons = screen.getAllByRole('button');
    const forwardBtns = currentButtons.filter(btn => {
      const text = btn.textContent?.trim() || '';
      const el = btn as HTMLElement;
      const isDisabled = el.hasAttribute('disabled') || el.style.opacity === '0.4';
      if (isDisabled) return false;
      return /continue.*test|take.*test|knowledge.*test|start.*test/i.test(text);
    });

    // Should have exactly 1 forward button, not 2
    expect(forwardBtns.length).toBe(1);
  });

  it('play phase SVGs do not stack to push controls below fold', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const svgs = document.querySelectorAll('svg');

    if (svgs.length >= 2) {
      // If there are 2+ SVGs, their combined viewBox height should be reasonable
      let totalHeight = 0;
      svgs.forEach(svg => {
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/);
          totalHeight += parseFloat(parts[3]) || 0;
        }
      });

      // Combined SVG height should leave room for controls (slider, buttons)
      // Max 500px combined viewBox height
      expect(totalHeight).toBeLessThanOrEqual(500);
    }
  });

  it('play phase card container has max-height with overflow for scrollability', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    const svgs = document.querySelectorAll('svg');
    if (svgs.length < 2) return;

    // Find the container that holds both SVGs and controls
    let container: Element | null = svgs[0].parentElement;
    let found = false;
    for (let depth = 0; depth < 6 && container; depth++) {
      const style = container.getAttribute('style') || '';
      if (style.includes('overflow') || style.includes('max-height') || style.includes('maxHeight')) {
        found = true;
        break;
      }
      container = container.parentElement;
    }

    // Container must have scroll support so controls remain accessible
    expect(found).toBe(true);
  });

  it('toggle switch has compact dimensions (not a large square)', () => {
    render(<InclinedPlaneRenderer gamePhase="play" />);
    // Find the vector toggle button
    const buttons = screen.getAllByRole('button');
    const toggleBtn = buttons.find(btn => {
      const style = btn.getAttribute('style') || '';
      return style.includes('border-radius') && style.includes('position: relative');
    });

    if (toggleBtn) {
      const style = toggleBtn.getAttribute('style') || '';
      const widthMatch = style.match(/width:\s*(\d+)px/);
      const heightMatch = style.match(/height:\s*(\d+)px/);

      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1]);
        const height = parseInt(heightMatch[1]);
        // Toggle should be compact: width ≤ 60px, height ≤ 30px
        expect(width).toBeLessThanOrEqual(60);
        expect(height).toBeLessThanOrEqual(30);
      }
    }
  });
});
