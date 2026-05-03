import { z } from 'zod';
import { registry } from '../../openapi/registry.js';
import { BOOK_STAGES, PROGRESS_MODES } from './workflow.js';
import { BookRoleEnum } from '../../lib/permissions.js';

export const BookDto = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    createdById: z.string(),
    updatedById: z.string().nullable(),
    lastEditAt: z.string().nullable(),
    stage: z.enum(BOOK_STAGES),
    progress: z.number().int().min(0).max(100),
    progressMode: z.enum(PROGRESS_MODES),
    stageChangedAt: z.string(),
    stageDueAt: z.string().nullable(),
    stageNote: z.string(),
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
        role: BookRoleEnum,
    })).max(50).default([])
        // Reject dup (userId, role) pairs explicitly. The DB has onConflictDoNothing as a
        // safety net but silently dropping client-sent rows is a confusing 200; 400 here.
        .refine((rows) => {
            const seen = new Set<string>();
            for (const r of rows) {
                const k = `${r.userId}:${r.role}`;
                if (seen.has(k)) return false;
                seen.add(k);
            }
            return true;
        }, { message: 'duplicate (userId, role) entries' }),
}).openapi('CreateBookBody');

export const UpdateBookBody = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
}).openapi('UpdateBookBody');

export const PatchBookStageBody = z.object({
    stage: z.enum(BOOK_STAGES),
    note: z.string().max(2_000).optional(),
    dueAt: z.string().datetime().nullable().optional(),
}).openapi('PatchBookStageBody');

export const PatchBookProgressBody = z.object({
    progress: z.number().int().min(0).max(100),
    mode: z.enum(PROGRESS_MODES).default('manual'),
}).openapi('PatchBookProgressBody');

export const BookStageHistoryDto = z.object({
    id: z.string(),
    bookId: z.string(),
    fromStage: z.enum(BOOK_STAGES).nullable(),
    toStage: z.enum(BOOK_STAGES),
    note: z.string(),
    createdById: z.string(),
    createdAt: z.string(),
}).openapi('BookStageHistory');

registry.register('Book', BookDto);
registry.register('BookSummary', BookSummaryDto);
registry.register('CreateBookBody', CreateBookBody);
registry.register('UpdateBookBody', UpdateBookBody);
registry.register('PatchBookStageBody', PatchBookStageBody);
registry.register('PatchBookProgressBody', PatchBookProgressBody);
registry.register('BookStageHistory', BookStageHistoryDto);
