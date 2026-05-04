import { ROLE_PERMISSIONS, type Role, type RolePermissions } from '@/editor/identity/types';

export const permsFor = (role: Role): RolePermissions => ROLE_PERMISSIONS[role];
