import { z } from 'zod';
import { SystemRole } from '../db/auth-schema.js';

// Per CLAUDE.md: prefer TS string-valued enums over literal unions for related constants.
// We use the const-object form (rather than the `enum` keyword) because TS enums lose
// literal assignability — `'editor'` is not a `BookRole` enum value at the type level,
// which would break dozens of legitimate string-literal call sites (seed data, fixtures,
// inline tests). The const-object gives the same runtime shape, the same narrowing
// behaviour, and adds enum-style namespacing via `BookRole.Editor`.
export const BookRole = {
    Editor: 'editor',
    Proofreader: 'proofreader',
    Translator: 'translator',
    Author: 'author',
    Typesetter: 'typesetter',
    Coordinator: 'coordinator',
} as const;
export type BookRole = typeof BookRole[keyof typeof BookRole];

export const ROLES = Object.values(BookRole) as [BookRole, ...BookRole[]];
export type Role = BookRole;

// Single source of truth for role enums in zod schemas. Anywhere a request body or query
// param refers to a book role, use this enum — never inline the literal list.
export const BookRoleEnum = z.enum(ROLES);

// Re-exported from `db/auth-schema` so module-bound callers don't need a table import.
// `SystemRoleEnum` is the zod surface and stays in sync with the SystemRole enum values.
export { SystemRole };
export const SystemRoleEnum = z.nativeEnum(SystemRole);

export type Permissions = {
    canEdit: boolean;
    canSuggest: boolean;
    canComment: boolean;
    canResolve: boolean;
    canManagePeople: boolean;
    canDeleteBook: boolean;
};

const zeroPerms: Permissions = {
    canEdit: false, canSuggest: false, canComment: false,
    canResolve: false, canManagePeople: false, canDeleteBook: false,
};

const ROLE_PERMS: Record<BookRole, Permissions> = {
    editor:      { ...zeroPerms, canEdit: true,    canComment: true, canResolve: true },
    proofreader: { ...zeroPerms, canSuggest: true, canComment: true },
    translator:  { ...zeroPerms, canSuggest: true, canComment: true },
    author:      { ...zeroPerms, canSuggest: true, canComment: true },
    typesetter:  { ...zeroPerms, canEdit: true,    canComment: true },
    coordinator: { ...zeroPerms, canComment: true, canResolve: true, canManagePeople: true },
};

const PERM_KEYS = Object.keys(zeroPerms) as (keyof Permissions)[];

// Driven by the keys of `zeroPerms` — adding a new field to Permissions is a one-line
// change at the type and the zero-init; no manual fold maintenance.
export function mergePermissions(roles: BookRole[]): Permissions {
    const out: Permissions = { ...zeroPerms };
    for (const r of roles) {
        const p = ROLE_PERMS[r];
        for (const k of PERM_KEYS) {
            if (p[k]) out[k] = true;
        }
    }
    return out;
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
