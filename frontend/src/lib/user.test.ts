import { describe, expect, it } from 'vitest';
import { displayName, userInitials } from '@/lib/user';

describe('user helpers', () => {
    it('builds initials from first and last name', () => {
        expect(userInitials('Anna Nowak')).toBe('AN');
    });

    it('returns fallback for empty name', () => {
        expect(userInitials(undefined)).toBe('??');
        expect(userInitials(undefined, 'X')).toBe('X');
    });

    it('prefers name over email for display', () => {
        expect(displayName({ name: 'Anna', email: 'a@example.com' })).toBe('Anna');
        expect(displayName({ email: 'a@example.com' })).toBe('a@example.com');
    });
});
