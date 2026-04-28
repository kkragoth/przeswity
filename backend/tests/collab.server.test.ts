import { describe, it, expect } from 'vitest';
import { hocuspocus } from '../src/collab/server';

describe('hocuspocus server', () => {
    it('exists with extensions', () => {
        expect(hocuspocus).toBeDefined();
        const exts = (hocuspocus as any).configuration?.extensions ?? (hocuspocus as any).extensions;
        expect(exts?.length ?? 0).toBeGreaterThanOrEqual(4);
    });
});
