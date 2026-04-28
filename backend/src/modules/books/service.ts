import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { book, assignment } from '../../db/schema.js';

export type BookRow = typeof book.$inferSelect;

export const projectBook = (b: BookRow) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    createdById: b.createdById,
    updatedById: b.updatedById ?? null,
    lastEditAt: b.lastEditAt ? new Date(b.lastEditAt).toISOString() : null,
    createdAt: new Date(b.createdAt).toISOString(),
    updatedAt: new Date(b.updatedAt).toISOString(),
});

export async function listVisibleBooks(userId: string, isAdmin: boolean): Promise<BookRow[]> {
    if (isAdmin) {
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

export async function getBookIfVisible(bookId: string, userId: string, isAdmin: boolean): Promise<BookRow | null> {
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return null;
    if (isAdmin) return b;
    if (b.createdById === userId) return b;
    const ass = await db.select().from(assignment)
        .where(and(eq(assignment.bookId, bookId), eq(assignment.userId, userId)));
    return ass.length > 0 ? b : null;
}

export async function userOwnsBook(bookId: string, userId: string): Promise<boolean> {
    const [b] = await db.select({ id: book.id }).from(book)
        .where(and(eq(book.id, bookId), eq(book.createdById, userId)));
    return !!b;
}
