import { z } from 'zod';
import { registry } from '../../openapi/registry.js';

export const SystemRoleEnum = z.enum(['admin', 'project_manager']).nullable();

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
    password: z.string().min(8),
    systemRole: SystemRoleEnum.default(null),
    competencyTags: z.array(z.string()).default([]),
}).openapi('CreateUserBody');

export const UpdateUserBody = z.object({
    name: z.string().min(1).optional(),
    systemRole: SystemRoleEnum.optional(),
    competencyTags: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
}).openapi('UpdateUserBody');

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
