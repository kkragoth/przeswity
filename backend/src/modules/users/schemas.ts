import { z } from 'zod';
import { registry } from '../../openapi/registry.js';
import { SystemRoleEnum as SystemRoleEnumBase } from '../../lib/permissions.js';

// Re-exported with `.nullable()` baked in — DB stores null for "no system role". The
// underlying enum lives in lib/permissions; this file only adds the nullability concern.
export const SystemRoleEnum = SystemRoleEnumBase.nullable();

export const UserDto = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    systemRole: SystemRoleEnum,
    competencyTags: z.array(z.string()),
    color: z.string(),
    image: z.string().nullable().optional(),
    preferredLocale: z.enum(['pl', 'en', 'ua']),
}).openapi('User');

export const MeDto = UserDto.extend({
    visibleBookCount: z.number().int().nonnegative(),
    assignmentRoleCounts: z.record(z.string(), z.number().int().nonnegative()),
    onboardingDismissedAt: z.string(),
}).openapi('Me');

export const CreateUserBody = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    // 72 = bcrypt hard limit; better-auth uses bcrypt under the hood. Keeping the cap
    // explicit here means we 400 before the auth layer truncates silently.
    password: z.string().min(8).max(72),
    systemRole: SystemRoleEnum.default(null),
    competencyTags: z.array(z.string()).default([]),
}).openapi('CreateUserBody');

export const UpdateUserBody = z.object({
    name: z.string().min(1).optional(),
    systemRole: SystemRoleEnum.optional(),
    competencyTags: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
}).openapi('UpdateUserBody');

export const UsersListQuery = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(200),
    offset: z.coerce.number().int().min(0).default(0),
}).openapi('UsersListQuery');

export const PatchMeBody = z.object({
    name: z.string().min(1).max(80).optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    image: z.string().url().nullable().optional(),
    preferredLocale: z.preprocess(
        (v) => typeof v === 'string' && v.toLowerCase().startsWith('uk') ? 'ua' : v,
        z.enum(['pl', 'en', 'ua']),
    ).optional(),
    onboardingDismissedAt: z.union([z.literal('now'), z.null()]).optional(),
}).strict().openapi('PatchMeBody');

// Register schemas so they appear in the OpenAPI document
registry.register('User', UserDto);
registry.register('Me', MeDto);
registry.register('CreateUserBody', CreateUserBody);
registry.register('UpdateUserBody', UpdateUserBody);
registry.register('PatchMeBody', PatchMeBody);
