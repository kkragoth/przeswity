import { z } from 'zod';
import { registry } from '../../openapi/registry.js';

export const BookDto = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    createdById: z.string(),
    updatedById: z.string().nullable(),
    lastEditAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
}).openapi('Book');

export const BookSummaryDto = BookDto.extend({
    myRoles: z.array(z.string()),
    assigneeCount: z.number().int().nonnegative(),
}).openapi('BookSummary');

export const CreateBookBody = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).default(''),
    initialMarkdown: z.string().max(500_000).default(''),
    initialAssignments: z.array(z.object({
        userId: z.string(),
        role: z.enum(['translator', 'author', 'editor', 'proofreader', 'typesetter', 'coordinator']),
    })).max(50).default([]),
}).openapi('CreateBookBody');

export const UpdateBookBody = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
}).openapi('UpdateBookBody');

registry.register('Book', BookDto);
registry.register('BookSummary', BookSummaryDto);
registry.register('CreateBookBody', CreateBookBody);
registry.register('UpdateBookBody', UpdateBookBody);
