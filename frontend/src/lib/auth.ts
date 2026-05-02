import { SystemRole } from '@/auth/types';
import type { SessionUser } from '@/auth/types';

export const isAdmin = (u: SessionUser): boolean =>
    u.systemRole === SystemRole.Admin;

export const isProjectManager = (u: SessionUser): boolean =>
    u.systemRole === SystemRole.ProjectManager;

export const canAccessCoordinator = (u: SessionUser): boolean =>
    isAdmin(u) || isProjectManager(u);

export const canAccessAdmin = isAdmin;

export const canCreateBooks = canAccessCoordinator;
