import { z } from 'zod';

export const SnapshotSummaryDto = z.object({
    id: z.string(),
    bookId: z.string(),
    label: z.string(),
    createdById: z.string(),
    createdAt: z.string(),
    createdBy: z.object({
        id: z.string(), name: z.string(), color: z.string(), email: z.string(), image: z.string().nullable().optional(),
    }),
}).openapi('SnapshotSummary');

export const CreateSnapshotBody = z.object({
    label: z.string().min(1).max(120),
}).openapi('CreateSnapshotBody');
