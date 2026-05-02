export enum Role {
    Translator = 'translator',
    Author = 'author',
    Editor = 'editor',
    Proofreader = 'proofreader',
    Typesetter = 'typesetter',
    Coordinator = 'coordinator',
    Admin = 'admin',
}

export const ALL_ROLES: Role[] = Object.values(Role);

/** Roles that can be @mentioned (excludes Admin). */
export const MENTIONABLE_ROLES: Role[] = ALL_ROLES.filter((r) => r !== Role.Admin);

export interface RolePermissions {
  canEdit: boolean
  canSuggest: boolean
  canComment: boolean
  canResolveSuggestion: boolean
  canResolveComment: boolean
  canExport: boolean
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
    [Role.Translator]:  { canEdit: true,  canSuggest: true,  canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    [Role.Author]:      { canEdit: false, canSuggest: true,  canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    [Role.Editor]:      { canEdit: true,  canSuggest: true,  canComment: true,  canResolveSuggestion: true,  canResolveComment: true,  canExport: true },
    [Role.Proofreader]: { canEdit: false, canSuggest: true,  canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    [Role.Typesetter]:  { canEdit: false, canSuggest: false, canComment: false, canResolveSuggestion: false, canResolveComment: false, canExport: true },
    [Role.Coordinator]: { canEdit: false, canSuggest: false, canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    [Role.Admin]:       { canEdit: true,  canSuggest: true,  canComment: true,  canResolveSuggestion: true,  canResolveComment: true,  canExport: true },
};

export interface User {
  id: string
  name: string
  color: string
  role: Role
}
