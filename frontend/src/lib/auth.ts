import { redirect } from '@tanstack/react-router';
import { SystemRole } from '@/auth/types';
import type { SessionUser } from '@/auth/types';

interface RouteContextLike {
    session: { user?: unknown } | null;
}

export const isAdmin = (u: SessionUser): boolean =>
    u.systemRole === SystemRole.Admin;

export const isProjectManager = (u: SessionUser): boolean =>
    u.systemRole === SystemRole.ProjectManager;

export const canAccessCoordinator = (u: SessionUser): boolean =>
    isAdmin(u) || isProjectManager(u);

export const canAccessAdmin = isAdmin;

export const canCreateBooks = canAccessCoordinator;

export function requireRole(
    context: RouteContextLike,
    predicate: (u: SessionUser) => boolean,
    fallbackTo: string = '/',
): SessionUser {
    const user = context.session?.user as SessionUser | undefined;
    if (!user || !predicate(user)) {
        throw redirect({ to: fallbackTo });
    }
    return user;
}
