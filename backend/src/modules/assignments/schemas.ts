import { z } from 'zod';

const RoleEnum = z.enum(['translator', 'author', 'editor', 'proofreader', 'typesetter', 'coordinator']);

export const AssignmentDto = z.object({
    bookId: z.string(),
    userId: z.string(),
    role: RoleEnum,
    createdAt: z.string(),
}).openapi('Assignment');

export const AssignmentWithUserDto = AssignmentDto.extend({
    user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        color: z.string(),
        image: z.string().nullable().optional(),
    }),
}).openapi('AssignmentWithUser');

export const CreateAssignmentBody = z.object({
    userId: z.string(),
    role: RoleEnum,
}).openapi('CreateAssignmentBody');

export const BulkCreateAssignmentsBody = z.object({
    assignments: z.array(z.object({
        userId: z.string(),
        role: RoleEnum,
    })).min(1).max(50),
}).openapi('BulkCreateAssignmentsBody');

export const BulkAssignmentResponse = z.object({
    created: z.array(AssignmentDto),
    existing: z.array(AssignmentDto),
    assignments: z.array(AssignmentDto),
}).openapi('BulkAssignmentResponse');
