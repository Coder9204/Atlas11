import TorqueRenderer from '../../components/TorqueRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { clearConsoleLogs } from '../setup';

createGameTestSuite('TorqueRenderer', TorqueRenderer, { tier: 'all' });

describe('Torque - Specific Physics Quality', () => {
  beforeEach(() => {
    cleanup();
    clearConsoleLogs();
  });

  it('play phase shows τ = r × F formula with visible color', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const content = document.body.textContent || '';
    // The core torque formula must be visible during experimentation, not hidden until review
    expect(content).toMatch(/τ\s*=\s*r\s*[×x]\s*F/);
  });

  it('torque value displayed prominently with N·m unit', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const content = document.body.textContent || '';
    // Should show the computed torque value with unit
    expect(content).toMatch(/\d+(\.\d+)?\s*N[·\-]m/);
  });

  it('ALL SVG text labels use fontSize >= 11 (stricter than factory 8px minimum)', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const tooSmall: string[] = [];
    document.querySelectorAll('svg text').forEach(el => {
      const fontSize = el.getAttribute('font-size') || el.getAttribute('fontSize') || '';
      const size = parseFloat(fontSize);
      if (size > 0 && size < 11) {
        tooSmall.push(`"${(el.textContent || '').trim().slice(0, 30)}" has fontSize ${size}`);
      }
    });
    expect(tooSmall).toEqual([]);
  });

  it('SVG text never uses dark fill on dark background', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const darkFills: string[] = [];
    document.querySelectorAll('svg text').forEach(el => {
      const fill = (el.getAttribute('fill') || '').toLowerCase();
      if (!fill) return;
      // Reject very dark fills that would be invisible on dark SVG backgrounds
      // Check if all RGB channels are below 0x30 (48 decimal)
      const hexMatch = fill.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
      if (fill === '#000' || fill === '#000000' || fill === 'black'
        || (hexMatch && parseInt(hexMatch[1], 16) < 48 && parseInt(hexMatch[2], 16) < 48 && parseInt(hexMatch[3], 16) < 48)) {
        darkFills.push(`"${(el.textContent || '').trim().slice(0, 30)}" has dark fill="${fill}"`);
      }
    });
    expect(darkFills).toEqual([]);
  });

  it('legend explains physics meaning (pivot, force, lever arm)', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const content = document.body.textContent || '';
    // Legend should reference key physics concepts, not just color labels
    expect(content).toMatch(/pivot/i);
    expect(content).toMatch(/force/i);
    expect(content).toMatch(/lever\s*arm|distance.*pivot|arm.*\(r\)/i);
  });
});

describe('Torque - UX Usability', () => {
  beforeEach(() => {
    cleanup();
    clearConsoleLogs();
  });

  it('observation guidance text appears BEFORE the SVG in play phase', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const allElements = Array.from(document.body.querySelectorAll('*'));
    let guidanceIndex = -1;
    let svgIndex = -1;
    allElements.forEach((el, i) => {
      if (guidanceIndex === -1 && /watch|notice|observe/i.test(el.textContent || '')) {
        guidanceIndex = i;
      }
      if (svgIndex === -1 && el.tagName === 'svg') {
        svgIndex = i;
      }
    });
    // Guidance text must exist and appear before the SVG
    expect(guidanceIndex).toBeGreaterThanOrEqual(0);
    expect(svgIndex).toBeGreaterThan(0);
    expect(guidanceIndex).toBeLessThan(svgIndex);
  });

  it('cause-effect text near slider explains physics relationship', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const content = document.body.textContent || '';
    // Must explain the physics: closer to hinge = more force, farther = less force
    expect(content).toMatch(/closer.*more\s*force|farther.*less\s*force|near.*hinge.*harder|distance.*force.*needed/i);
  });

  it('Push Door button click causes visible state change', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const buttons = screen.getAllByRole('button');
    const pushBtn = buttons.find(btn =>
      /push\s*door/i.test(btn.textContent?.trim() || '')
    );
    expect(pushBtn).toBeTruthy();

    const contentBefore = document.body.innerHTML;
    if (pushBtn) fireEvent.click(pushBtn);
    const contentAfter = document.body.innerHTML;

    // Clicking the push button should cause a visible change (button text, SVG, or state)
    expect(contentAfter).not.toBe(contentBefore);
  });

  it('transfer phase has Next Application navigation between apps', () => {
    render(<TorqueRenderer gamePhase="transfer" />);
    const buttons = screen.getAllByRole('button');
    const nextAppBtn = buttons.find(btn =>
      /next.*application/i.test(btn.textContent?.trim() || '')
    );
    // Must have a "Next Application" button for sequential navigation
    expect(nextAppBtn).toBeTruthy();
  });

  it('quiz answer review after submission shows per-question indicators', () => {
    render(<TorqueRenderer gamePhase="test" />);

    // Complete all 10 quiz questions
    for (let q = 0; q < 10; q++) {
      // Find and click the first answer option - look for buttons with option letter prefix
      const allBtns = screen.getAllByRole('button');
      const option = allBtns.find(btn => {
        const text = btn.textContent?.trim() || '';
        // Options start with A, B, C, or D followed by longer text
        return /^[ABCD]/.test(text) && text.length > 5;
      });
      if (option) fireEvent.click(option);

      // Click Next or Submit
      const btnsAfter = screen.getAllByRole('button');
      if (q < 9) {
        const nextBtn = btnsAfter.find(btn => btn.textContent?.trim() === 'Next');
        if (nextBtn && !nextBtn.hasAttribute('disabled')) fireEvent.click(nextBtn);
      } else {
        const submitBtn = btnsAfter.find(btn => /submit\s*test/i.test(btn.textContent || ''));
        if (submitBtn) fireEvent.click(submitBtn);
      }
    }

    // After submission, verify per-question review exists
    const content = document.body.textContent || '';
    // Review should show "Question 1" label from the review section
    expect(content).toMatch(/question\s*1/i);
    // Review should show checkmark or cross indicators (Unicode)
    const html = document.body.innerHTML;
    expect(html).toMatch(/[\u2713\u2717✓✗]/);
  });

  it('seesaw slider in twist_play produces meaningful tilt change', () => {
    render(<TorqueRenderer gamePhase="twist_play" />);
    const svg = document.querySelector('svg');
    const getRotation = () => {
      const groups = svg?.querySelectorAll('g') || [];
      for (const g of groups) {
        const transform = g.getAttribute('transform') || '';
        if (transform.includes('rotate')) return transform;
      }
      return '';
    };
    const rotBefore = getRotation();

    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);

    // Change first slider to extreme value
    fireEvent.change(sliders[0], { target: { value: '10' } });
    const rotAfter = getRotation();

    // Rotation should change when weight changes
    expect(rotAfter).not.toBe(rotBefore);
  });

  it('push point in SVG has visual emphasis (glow or animation)', () => {
    render(<TorqueRenderer gamePhase="play" />);
    const svg = document.querySelector('svg');
    const circles = svg?.querySelectorAll('circle') || [];
    let hasGlowOrAnimation = false;
    circles.forEach(c => {
      const filter = c.getAttribute('filter') || '';
      const animate = c.querySelector('animate');
      if (filter.includes('Glow') || filter.includes('glow') || animate) {
        hasGlowOrAnimation = true;
      }
    });
    // Main interaction point must have visual emphasis
    expect(hasGlowOrAnimation).toBe(true);
  });
});
