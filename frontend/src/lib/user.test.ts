import { describe, expect, it } from 'vitest';
import { displayName } from '@/lib/user';

describe('user helpers', () => {
    it('prefers name over email for display', () => {
        expect(displayName({ name: 'Anna', email: 'a@example.com' })).toBe('Anna');
        expect(displayName({ email: 'a@example.com' })).toBe('a@example.com');
    });

    it('returns empty string when no name or email', () => {
        expect(displayName({})).toBe('');
    });
});
