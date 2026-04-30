import { z } from 'zod';
import { SystemRole } from '../db/auth-schema.js';

export const ROLES = ['editor', 'proofreader', 'translator', 'author', 'typesetter', 'coordinator'] as const;
export type BookRole = typeof ROLES[number];
export type Role = BookRole;

// Single source of truth for role enums in zod schemas. Anywhere a request body or query
// param refers to a book role, use this enum — never inline the literal list.
export const BookRoleEnum = z.enum(ROLES);

export type Permissions = {
    canEdit: boolean;
    canSuggest: boolean;
    canComment: boolean;
    canResolve: boolean;
    canManagePeople: boolean;
    canDeleteBook: boolean;
};

const ROLE_PERMS: Record<BookRole, Permissions> = {
    editor:      { canEdit: true,  canSuggest: false, canComment: true,  canResolve: true,  canManagePeople: false, canDeleteBook: false },
    proofreader: { canEdit: false, canSuggest: true,  canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    translator:  { canEdit: false, canSuggest: true,  canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    author:      { canEdit: false, canSuggest: true,  canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    typesetter:  { canEdit: true,  canSuggest: false, canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    coordinator: { canEdit: false, canSuggest: false, canComment: true,  canResolve: true,  canManagePeople: true,  canDeleteBook: false },
};

export function mergePermissions(roles: BookRole[]): Permissions {
    const start: Permissions = { canEdit: false, canSuggest: false, canComment: false, canResolve: false, canManagePeople: false, canDeleteBook: false };
    return roles.reduce((acc, r) => {
        const p = ROLE_PERMS[r];
        return {
            canEdit: acc.canEdit || p.canEdit,
            canSuggest: acc.canSuggest || p.canSuggest,
            canComment: acc.canComment || p.canComment,
            canResolve: acc.canResolve || p.canResolve,
            canManagePeople: acc.canManagePeople || p.canManagePeople,
            canDeleteBook: acc.canDeleteBook || p.canDeleteBook,
        };
    }, start);
}

export function isAdmin(systemRole: string | null | undefined): boolean {
    return systemRole === SystemRole.Admin;
}

export function isProjectManager(systemRole: string | null | undefined): boolean {
    return systemRole === SystemRole.Admin || systemRole === SystemRole.ProjectManager;
}

export function permissionsForUser(
    roles: BookRole[],
    user: { systemRole?: string | null; isOwner?: boolean },
): Permissions {
    const base = mergePermissions(roles);
    if (isAdmin(user.systemRole)) {
        return { canEdit: true, canSuggest: true, canComment: true, canResolve: true, canManagePeople: true, canDeleteBook: true };
    }
    if (user.isOwner) {
        // Owners get full collaborative permissions + people management. canDeleteBook
        // stays false: book deletion is an explicit admin-only policy at the route level.
        return { canEdit: true, canSuggest: true, canComment: true, canResolve: true, canManagePeople: true, canDeleteBook: false };
    }
    return base;
}
