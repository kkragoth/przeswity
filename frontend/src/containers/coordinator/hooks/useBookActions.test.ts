import { describe, expect, it } from 'vitest';
import { shouldCommitProgress, shouldCommitStage } from '@/hooks/api/useBookActions';

describe('useBookActions predicates', () => {
    it('skips stage commit for nullish/equal draft', () => {
        expect(shouldCommitStage('editing', undefined)).toBe(false);
        expect(shouldCommitStage('editing', 'editing')).toBe(false);
        expect(shouldCommitStage('editing', 'proofreading')).toBe(true);
    });

    it('skips progress commit for nullish/equal/out-of-range draft', () => {
        expect(shouldCommitProgress(10, undefined)).toBe(false);
        expect(shouldCommitProgress(10, 10)).toBe(false);
        expect(shouldCommitProgress(10, -1)).toBe(false);
        expect(shouldCommitProgress(10, 101)).toBe(false);
        expect(shouldCommitProgress(10, 50)).toBe(true);
    });
});
