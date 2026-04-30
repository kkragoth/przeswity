import type { Role } from '@/editor/identity/types';

type RoleI18nKey =
    | 'roles.editor'
    | 'roles.proofreader'
    | 'roles.translator'
    | 'roles.author'
    | 'roles.typesetter'
    | 'roles.coordinator'
    | 'roles.admin';

export function roleI18nKey(role: Role | string): RoleI18nKey {
    return `roles.${role as Role}` as RoleI18nKey;
}
