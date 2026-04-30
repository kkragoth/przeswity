import { describe, expect, it } from 'vitest';
import { deriveMyRoles } from '@/hooks/api/useBookContext';
import type { AssignmentWithUser } from '@/api/generated/types.gen';

describe('deriveMyRoles', () => {
    it('creates stable role snapshot for a user', () => {
        const fixture: AssignmentWithUser[] = [
            {
                bookId: 'b1',
                userId: 'u1',
                role: 'editor',
                createdAt: '2026-01-01T00:00:00.000Z',
                user: { id: 'u1', email: 'u1@example.com', name: 'U1', color: '#111111' },
            },
            {
                bookId: 'b1',
                userId: 'u2',
                role: 'translator',
                createdAt: '2026-01-01T00:00:00.000Z',
                user: { id: 'u2', email: 'u2@example.com', name: 'U2', color: '#222222' },
            },
            {
                bookId: 'b1',
                userId: 'u1',
                role: 'proofreader',
                createdAt: '2026-01-01T00:00:00.000Z',
                user: { id: 'u1', email: 'u1@example.com', name: 'U1', color: '#111111' },
            },
        ];

        expect(deriveMyRoles(fixture, 'u1')).toMatchInlineSnapshot(`
          [
            "editor",
            "proofreader",
          ]
        `);
    });
});
