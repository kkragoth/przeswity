export type Role =
  | 'translator'
  | 'author'
  | 'editor'
  | 'proofreader'
  | 'typesetter'
  | 'coordinator'
  | 'admin'

export interface RolePermissions {
  canEdit: boolean
  canSuggest: boolean
  canComment: boolean
  canResolveSuggestion: boolean
  canResolveComment: boolean
  canExport: boolean
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
    translator:  { canEdit: true,  canSuggest: true,  canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    author:      { canEdit: false, canSuggest: true,  canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    editor:      { canEdit: true,  canSuggest: true,  canComment: true,  canResolveSuggestion: true,  canResolveComment: true,  canExport: true },
    proofreader: { canEdit: false, canSuggest: true,  canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    typesetter:  { canEdit: false, canSuggest: false, canComment: false, canResolveSuggestion: false, canResolveComment: false, canExport: true },
    coordinator: { canEdit: false, canSuggest: false, canComment: true,  canResolveSuggestion: false, canResolveComment: false, canExport: true },
    admin:       { canEdit: true,  canSuggest: true,  canComment: true,  canResolveSuggestion: true,  canResolveComment: true,  canExport: true },
};

export interface User {
  id: string
  name: string
  color: string
  role: Role
}
