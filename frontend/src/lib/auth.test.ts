import { describe, it, expect, vi } from 'vitest';
import { SystemRole } from '@/auth/types';
import type { SessionUser } from '@/auth/types';
import {
    isAdmin,
    isProjectManager,
    canAccessCoordinator,
    canAccessAdmin,
    canCreateBooks,
    requireRole,
} from '@/lib/auth';

vi.mock('@tanstack/react-router', () => ({
    redirect: (opts: { to: string }) => ({ _isRedirect: true, to: opts.to }),
}));

const adminUser: SessionUser = { id: '1', email: 'a@a.com', systemRole: SystemRole.Admin };
const pmUser: SessionUser = { id: '2', email: 'b@b.com', systemRole: SystemRole.ProjectManager };
const regularUser: SessionUser = { id: '3', email: 'c@c.com', systemRole: null };

const ctxWith = (user: unknown) => ({ session: { user } });
const ctxEmpty = { session: null };
const ctxNoUser = { session: {} };

describe('isAdmin', () => {
    it('returns true for Admin', () => expect(isAdmin(adminUser)).toBe(true));
    it('returns false for ProjectManager', () => expect(isAdmin(pmUser)).toBe(false));
});

describe('isProjectManager', () => {
    it('returns true for ProjectManager', () => expect(isProjectManager(pmUser)).toBe(true));
    it('returns false for Admin', () => expect(isProjectManager(adminUser)).toBe(false));
});

describe('canAccessCoordinator', () => {
    it('allows Admin', () => expect(canAccessCoordinator(adminUser)).toBe(true));
    it('allows ProjectManager', () => expect(canAccessCoordinator(pmUser)).toBe(true));
    it('blocks regular user', () => expect(canAccessCoordinator(regularUser)).toBe(false));
});

describe('canAccessAdmin / canCreateBooks aliases', () => {
    it('canAccessAdmin === isAdmin', () => expect(canAccessAdmin).toBe(isAdmin));
    it('canCreateBooks === canAccessCoordinator', () => expect(canCreateBooks).toBe(canAccessCoordinator));
});

describe('requireRole', () => {
    it('returns the user when predicate passes', () => {
        const result = requireRole(ctxWith(adminUser), isAdmin);
        expect(result).toBe(adminUser);
    });

    it('throws redirect when session is null', () => {
        expect(() => requireRole(ctxEmpty, isAdmin)).toThrow();
    });

    it('throws redirect when user is absent', () => {
        expect(() => requireRole(ctxNoUser, isAdmin)).toThrow();
    });

    it('throws redirect when predicate fails', () => {
        expect(() => requireRole(ctxWith(regularUser), isAdmin)).toThrow();
    });

    it('redirects to "/" by default', () => {
        let thrown: unknown;
        try {
            requireRole(ctxWith(regularUser), isAdmin);
        } catch (e) {
            thrown = e;
        }
        expect((thrown as { to: string }).to).toBe('/');
    });

    it('honors custom fallbackTo', () => {
        let thrown: unknown;
        try {
            requireRole(ctxWith(regularUser), isAdmin, '/login');
        } catch (e) {
            thrown = e;
        }
        expect((thrown as { to: string }).to).toBe('/login');
    });
});
