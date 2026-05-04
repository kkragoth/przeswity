import { describe, it, expect } from 'vitest';
import { isDropAbove } from './useBlockDragDrop';

function rect(top: number, height: number): DOMRect {
    return { top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}

describe('isDropAbove', () => {
    it('returns true when pointer is in the upper half', () => {
        expect(isDropAbove(110, rect(100, 40))).toBe(true);  // 110 < 100+20 = false? no, 110 < 120 = true
    });

    it('returns false when pointer is in the lower half', () => {
        expect(isDropAbove(125, rect(100, 40))).toBe(false); // 125 >= 120
    });

    it('returns true at the exact midpoint boundary (strictly less than)', () => {
        // midpoint = 100 + 40*0.5 = 120; clientY=119 is above
        expect(isDropAbove(119, rect(100, 40))).toBe(true);
        // clientY=120 is NOT above (not strictly less)
        expect(isDropAbove(120, rect(100, 40))).toBe(false);
    });
});
