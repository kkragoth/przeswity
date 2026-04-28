import { Database } from '@hocuspocus/extension-database';
import { db } from '../db/client.js';
import { bookYjsState, book } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { lastEditorByBook } from './lastEditor.js';

export const persistence = new Database({
    fetch: async ({ documentName }) => {
        const bookId = documentName.replace(/^book:/, '');
        const [row] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
        return row?.state ? new Uint8Array(row.state) : null;
    },
    store: async ({ documentName, state }) => {
        const bookId = documentName.replace(/^book:/, '');
        const editorId = lastEditorByBook.get(bookId) ?? null;
        const now = new Date();
        await db.transaction(async (tx) => {
            await tx.insert(bookYjsState).values({ bookId, state: Buffer.from(state) as unknown as Uint8Array })
                .onConflictDoUpdate({
                    target: bookYjsState.bookId,
                    set: { state: Buffer.from(state) as unknown as Uint8Array, updatedAt: now },
                });
            if (editorId) {
                await tx.update(book).set({ updatedById: editorId, lastEditAt: now, updatedAt: now })
                    .where(eq(book.id, bookId));
            }
        });
    },
});
