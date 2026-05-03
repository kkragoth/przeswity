import { Database } from '@hocuspocus/extension-database';
import { db } from '../db/client.js';
import { bookYjsState, book } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { asByteaInput } from '../lib/bytes.js';
import type { CollabContext } from './auth.js';

export const persistence = new Database({
    fetch: async ({ documentName }) => {
        const bookId = documentName.replace(/^book:/, '');
        const [row] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
        return row?.state ? new Uint8Array(row.state) : null;
    },
    store: async ({ documentName, state, context }) => {
        const bookId = documentName.replace(/^book:/, '');
        // Pull editor identity straight from the auth context that was attached at
        // onAuthenticate time. Replaces the old process-local lastEditorByBook map which
        // didn't survive restarts and didn't work with multi-process deploys.
        const editorId = (context as CollabContext | null)?.user?.id ?? null;
        const now = new Date();
        const bytes = asByteaInput(state);
        await db.transaction(async (tx) => {
            await tx.insert(bookYjsState).values({ bookId, state: bytes })
                .onConflictDoUpdate({
                    target: bookYjsState.bookId,
                    set: { state: bytes, updatedAt: now },
                });
            if (editorId) {
                await tx.update(book).set({ updatedById: editorId, lastEditAt: now, updatedAt: now })
                    .where(eq(book.id, bookId));
            }
        });
    },
});
