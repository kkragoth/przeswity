export type Role = 'editor' | 'proofreader' | 'translator' | 'author' | 'typesetter' | 'coordinator';
export const ROLES = ['editor', 'proofreader', 'translator', 'author', 'typesetter', 'coordinator'] as const;

export type Permissions = {
    canEdit: boolean;
    canSuggest: boolean;
    canComment: boolean;
    canResolve: boolean;
    canManagePeople: boolean;
    canDeleteBook: boolean;
};

const ROLE_PERMS: Record<Role, Permissions> = {
    editor:      { canEdit: true,  canSuggest: false, canComment: true,  canResolve: true,  canManagePeople: false, canDeleteBook: false },
    proofreader: { canEdit: false, canSuggest: true,  canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    translator:  { canEdit: false, canSuggest: true,  canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    author:      { canEdit: false, canSuggest: true,  canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    typesetter:  { canEdit: true,  canSuggest: false, canComment: true,  canResolve: false, canManagePeople: false, canDeleteBook: false },
    coordinator: { canEdit: false, canSuggest: false, canComment: true,  canResolve: true,  canManagePeople: true,  canDeleteBook: false },
};

export function mergePermissions(roles: Role[]): Permissions {
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

export function permissionsForUser(
    roles: Role[],
    user: { isAdmin: boolean; isCoordinator: boolean; isOwner?: boolean },
): Permissions {
    const base = mergePermissions(roles);
    if (user.isAdmin) {
        return { canEdit: true, canSuggest: true, canComment: true, canResolve: true, canManagePeople: true, canDeleteBook: true };
    }
    if (user.isOwner) {
        return { ...base, canManagePeople: true };
    }
    return base;
}
