import { describe, expect, it } from 'vitest';
import { isImmersiveRoute } from '@/lib/routes';

describe('isImmersiveRoute', () => {
    it('matches editor book route', () => {
        expect(isImmersiveRoute('/books/abc')).toBe(true);
    });

    it('does not match dashboard route', () => {
        expect(isImmersiveRoute('/coordinator')).toBe(false);
    });
});
