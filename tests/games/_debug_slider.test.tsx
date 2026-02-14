import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import GalvanicCorrosionRenderer from '../../components/GalvanicCorrosionRenderer';

describe('Debug slider', () => {
  beforeEach(() => { cleanup(); });

  it('galvanic slider change', () => {
    render(React.createElement(GalvanicCorrosionRenderer, { gamePhase: 'play' }));
    const slider = document.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;

    console.log('SLIDER found:', !!slider);
    console.log('SLIDER min:', slider?.min, 'max:', slider?.max, 'value:', slider?.value);

    const parent = slider?.parentElement;
    const grandparent = parent?.parentElement;
    console.log('PARENT tag:', parent?.tagName, 'text:', parent?.textContent?.substring(0, 100));
    console.log('GRANDPARENT tag:', grandparent?.tagName, 'text:', grandparent?.textContent?.substring(0, 100));

    const textBefore = grandparent?.textContent || '';
    console.log('TEXT BEFORE (100 chars):', textBefore.substring(0, 100));

    const mid = (Number(slider.min) + Number(slider.max)) / 2;
    const newVal = Number(slider.value) === mid ? Number(slider.max) * 0.9 : mid;
    console.log('newVal:', newVal, 'current value:', slider.value, 'mid:', mid);

    fireEvent.change(slider, { target: { value: String(newVal) } });

    console.log('SLIDER value after change:', slider.value);

    const textAfter = grandparent?.textContent || '';
    console.log('TEXT AFTER (100 chars):', textAfter.substring(0, 100));
    console.log('CHANGED:', textBefore !== textAfter);

    // Also check the SVG
    const svg = document.querySelector('svg');
    console.log('SVG textContent (50 chars):', svg?.textContent?.substring(0, 80));
  });
});
