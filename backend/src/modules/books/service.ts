import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { book, assignment } from '../../db/schema.js';
import { toIso, toIsoOrThrow } from '../../lib/dto.js';

export type BookRow = typeof book.$inferSelect;

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

