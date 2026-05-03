import { eq, inArray, desc, and, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { book, assignment, bookStageHistory, bookYjsState, user } from '../../db/schema.js';
import { toIso, toIsoOrThrow } from '../../lib/dto.js';
import { AppError } from '../../lib/errors.js';
import { asByteaInput } from '../../lib/bytes.js';
import { markdownToYDocState } from '@przeswity/editor-schema/markdown';
import { CreateBookBody, PatchBookProgressBody, PatchBookStageBody } from './schemas.js';
import { isValidProgress, type BookStage } from './workflow.js';

export type BookRow = typeof book.$inferSelect;
type CreateBody = z.infer<typeof CreateBookBody>;
type StageBody = z.infer<typeof PatchBookStageBody>;
type ProgressBody = z.infer<typeof PatchBookProgressBody>;

export const projectBook = (b: BookRow) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    createdById: b.createdById,
    updatedById: b.updatedById ?? null,
    lastEditAt: toIso(b.lastEditAt),
    stage: b.stage,
    progress: b.progress,
    progressMode: b.progressMode,
    stageChangedAt: toIsoOrThrow(b.stageChangedAt),
    stageDueAt: toIso(b.stageDueAt),
    stageNote: b.stageNote,
    createdAt: toIsoOrThrow(b.createdAt),
    updatedAt: toIsoOrThrow(b.updatedAt),
});

export async function listVisibleBooks(userId: string, admin: boolean): Promise<BookRow[]> {
    if (admin) {
        return db.select().from(book).orderBy(desc(book.updatedAt));
    }
    const myAssigned = await db.select({ bookId: assignment.bookId })
        .from(assignment).where(eq(assignment.userId, userId));
    const assignedIds = [...new Set(myAssigned.map((r) => r.bookId))];
    const owned = await db.select().from(book).where(eq(book.createdById, userId));
    const assigned = assignedIds.length
        ? await db.select().from(book).where(inArray(book.id, assignedIds))
        : [];
    const seen = new Set<string>();
    const merged: BookRow[] = [];
    for (const row of [...owned, ...assigned]) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
    }
    merged.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return merged;
}

export async function listAssigneeCounts(bookIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (bookIds.length === 0) return counts;
    const rows = await db.select({ bookId: assignment.bookId, userId: assignment.userId })
        .from(assignment).where(inArray(assignment.bookId, bookIds));
    const distinct = new Map<string, Set<string>>();
    for (const r of rows) {
        if (!distinct.has(r.bookId)) distinct.set(r.bookId, new Set());
        distinct.get(r.bookId)!.add(r.userId);
    }
    for (const [k, v] of distinct) counts.set(k, v.size);
    return counts;
}

export async function listMyRolesByBook(userId: string): Promise<Map<string, string[]>> {
    const rows = await db.select({ bookId: assignment.bookId, role: assignment.role })
        .from(assignment).where(eq(assignment.userId, userId));
    const m = new Map<string, string[]>();
    for (const r of rows) m.set(r.bookId, [...(m.get(r.bookId) ?? []), r.role]);
    return m;
}

const dedupAssignments = (input: CreateBody['initialAssignments']): { userId: string; role: string }[] => {
    const seen = new Set<string>();
    return input.filter((a) => {
        const k = `${a.userId}:${a.role}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

// Postgres FK violation → SQLSTATE 23503. A concurrent user delete between our existence
// check and the assignment insert would land here; we translate to 409 so the caller can
// retry instead of seeing an opaque 500.
const isForeignKeyViolation = (e: unknown): boolean =>
    typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';

export async function createBookWithSeed(
    me: { id: string },
    body: CreateBody,
): Promise<BookRow> {
    const userIds = [...new Set(body.initialAssignments.map((a) => a.userId))];
    if (userIds.length > 0) {
        const found = await db.select({ id: user.id }).from(user).where(inArray(user.id, userIds));
        const foundSet = new Set(found.map((u) => u.id));
        const unknown = userIds.filter((id) => !foundSet.has(id));
        if (unknown.length) throw new AppError('errors.assignment.unknownUsers', 422, `unknown users: ${unknown.join(',')}`);
    }
    const yState = body.initialMarkdown.trim().length > 0 ? markdownToYDocState(body.initialMarkdown) : null;

    try {
        return await db.transaction(async (tx) => {
            const [b] = await tx.insert(book).values({
                title: body.title,
                description: body.description,
                createdById: me.id,
                initialMarkdown: body.initialMarkdown,
            }).returning();
            await tx.insert(bookStageHistory).values({
                bookId: b.id,
                fromStage: null,
                toStage: b.stage,
                note: 'initial',
                createdById: me.id,
            });
            if (yState) {
                await tx.insert(bookYjsState).values({ bookId: b.id, state: asByteaInput(yState) });
            }
            if (body.initialAssignments.length > 0) {
                const rows = dedupAssignments(body.initialAssignments).map((a) => ({ bookId: b.id, userId: a.userId, role: a.role }));
                await tx.insert(assignment).values(rows).onConflictDoNothing();
            }
            return b;
        });
    } catch (e) {
        if (isForeignKeyViolation(e)) {
            throw new AppError('errors.assignment.userRaceCondition', 409, 'one or more assignees disappeared mid-create');
        }
        throw e;
    }
}

export async function updateBookFields(
    bookId: string,
    me: { id: string },
    admin: boolean,
    fields: { title?: string; description?: string },
): Promise<BookRow> {
    const update: Partial<typeof book.$inferInsert> = { updatedAt: new Date() };
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    // TOCTOU guard: re-assert the policy predicate inline so a concurrent owner change
    // can't slip an UPDATE past the SELECT-time check.
    const policy = admin ? sql`true` : eq(book.createdById, me.id);
    const [updated] = await db.update(book).set(update)
        .where(and(eq(book.id, bookId), policy))
        .returning();
    if (!updated) throw new AppError('errors.book.forbidden', 409, 'concurrent ownership change');
    return updated;
}

export async function transitionStage(
    bookId: string,
    me: { id: string },
    fromStage: BookStage,
    body: StageBody,
    existingDueAt: Date | null,
): Promise<BookRow> {
    const now = new Date();
    return db.transaction(async (tx) => {
        // TOCTOU guard: pin from-stage in WHERE clause so a concurrent transition can't
        // sneak a write through after we read `existing.stage`.
        const [u] = await tx.update(book).set({
            stage: body.stage,
            stageChangedAt: now,
            stageDueAt: body.dueAt === undefined ? existingDueAt : (body.dueAt ? new Date(body.dueAt) : null),
            stageNote: body.note ?? '',
            updatedAt: now,
            updatedById: me.id,
        }).where(and(eq(book.id, bookId), eq(book.stage, fromStage))).returning();
        if (!u) throw new AppError('errors.book.stage.transitionForbidden', 409, 'concurrent stage change');
        await tx.insert(bookStageHistory).values({
            bookId: u.id,
            fromStage,
            toStage: body.stage,
            note: body.note ?? '',
            createdById: me.id,
        });
        return u;
    });
}

export async function updateProgress(
    bookId: string,
    me: { id: string },
    body: ProgressBody,
): Promise<BookRow> {
    if (!isValidProgress(body.progress)) {
        throw new AppError('errors.book.progress.invalid', 422, 'progress must be integer in range 0..100');
    }
    const [updated] = await db.update(book).set({
        progress: body.progress,
        progressMode: body.mode,
        updatedAt: new Date(),
        updatedById: me.id,
    }).where(eq(book.id, bookId)).returning();
    if (!updated) throw new AppError('errors.book.notFound', 404, 'book not found');
    return updated;
}

export async function getStageHistory(bookId: string) {
    const rows = await db.select().from(bookStageHistory)
        .where(eq(bookStageHistory.bookId, bookId))
        .orderBy(asc(bookStageHistory.createdAt));
    return rows.map((r) => ({
        id: r.id,
        bookId: r.bookId,
        fromStage: r.fromStage,
        toStage: r.toStage,
        note: r.note,
        createdById: r.createdById,
        createdAt: new Date(r.createdAt).toISOString(),
    }));
}

export async function loadBookOrThrow(bookId: string): Promise<BookRow> {
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) throw new AppError('errors.book.notFound', 404, 'book not found');
    return b;
}
