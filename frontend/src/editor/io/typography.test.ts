import { describe, it, expect } from 'vitest';
import { ptToHalfPoints, ptToTwips, ptToPx, lineHeightTo240ths, TYPOGRAPHY, PAGE, FONT_FAMILIES } from './typography';

describe('unit conversions', () => {
    it('ptToHalfPoints multiplies by 2', () => {
        expect(ptToHalfPoints(11)).toBe(22);
        expect(ptToHalfPoints(22.5)).toBe(45);
    });

    it('ptToTwips multiplies by 20', () => {
        expect(ptToTwips(72)).toBe(1440);
        expect(ptToTwips(11)).toBe(220);
    });

    it('ptToPx converts at 96dpi', () => {
        expect(ptToPx(72)).toBe(96);
        expect(ptToPx(12)).toBe(16);
    });

    it('lineHeightTo240ths multiplies multiplier by 240', () => {
        expect(lineHeightTo240ths(1)).toBe(240);
        expect(lineHeightTo240ths(1.5)).toBe(360);
    });
});

describe('typography manifest', () => {
    it('exposes the three Liberation families', () => {
        expect(FONT_FAMILIES.serif).toBe('Liberation Serif');
        expect(FONT_FAMILIES.sans).toBe('Liberation Sans');
        expect(FONT_FAMILIES.mono).toBe('Liberation Mono');
    });

    it('body matches the current editor 16px / 1.5', () => {
        expect(TYPOGRAPHY.body.sizePt).toBe(12);
        expect(TYPOGRAPHY.body.lineHeight).toBe(1.5);
        expect(TYPOGRAPHY.body.family).toBe('serif');
    });

    it('headings preserve current editor pixel sizes', () => {
        expect(ptToPx(TYPOGRAPHY.h1.sizePt)).toBe(30);
        expect(ptToPx(TYPOGRAPHY.h2.sizePt)).toBe(22);
        expect(ptToPx(TYPOGRAPHY.h3.sizePt)).toBe(18);
    });

    it('code uses mono at 13px', () => {
        expect(TYPOGRAPHY.code.family).toBe('mono');
        expect(ptToPx(TYPOGRAPHY.code.sizePt)).toBeCloseTo(13, 0);
    });

    it('A4 page setup is 595x842pt with 72pt margins', () => {
        expect(PAGE.widthPt).toBe(595);
        expect(PAGE.heightPt).toBe(842);
        expect(PAGE.marginTopPt).toBe(72);
        expect(PAGE.marginLeftPt).toBe(72);
    });
});
