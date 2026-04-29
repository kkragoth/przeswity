import { describe, it, expect } from 'vitest';
import {
    ptToHalfPoints,
    ptToTwips,
    ptToPx,
    lineHeightTo240ths,
    TYPOGRAPHY,
    PAGE,
    FONT_FAMILIES,
    buildDocxStyles,
    buildDocxPageProperties,
} from './typography';

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

    it('A4 page setup matches Word twips (11906x16838) with 1in margins', () => {
        expect(ptToTwips(PAGE.widthPt)).toBe(11906);
        expect(ptToTwips(PAGE.heightPt)).toBe(16838);
        expect(PAGE.marginTopPt).toBe(72);
        expect(PAGE.marginLeftPt).toBe(72);
    });
});

describe('buildDocxStyles', () => {
    const styles = buildDocxStyles();

    it('default run uses Liberation Serif at 24 half-points (12pt body)', () => {
        const run = styles.default!.document!.run!;
        expect(run.font).toBe('Liberation Serif');
        expect(run.size).toBe(24);
    });

    it('default paragraph spacing is 360 line / 0 before / 160 after (twips)', () => {
        const para = styles.default!.document!.paragraph!;
        expect(para.spacing!.line).toBe(360);
        expect(para.spacing!.before).toBe(0);
        expect(para.spacing!.after).toBe(160);
    });

    it('Heading1 paragraph style overrides size to 45 half-points (22.5pt)', () => {
        const h1 = styles.paragraphStyles!.find((s) => s.id === 'Heading1');
        expect(h1).toBeDefined();
        expect(h1!.run!.size).toBe(45);
        expect(h1!.run!.bold).toBe(true);
    });

    it('Code paragraph style uses Liberation Mono', () => {
        const code = styles.paragraphStyles!.find((s) => s.id === 'Code');
        expect(code!.run!.font).toBe('Liberation Mono');
    });
});

describe('buildDocxPageProperties', () => {
    it('A4 size and 1440-twip margins', () => {
        const page = buildDocxPageProperties();
        expect(page.size.width).toBe(11906);
        expect(page.size.height).toBe(16838);
        expect(page.margin.top).toBe(1440);
    });
});
