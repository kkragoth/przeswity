import { Database } from '@hocuspocus/extension-database';
import { db } from '../db/client.js';
import { bookYjsState, book } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { asByteaInput } from '../lib/bytes.js';
import { log } from '../lib/log.js';
import type { CollabContext } from './auth.js';

// Soft warning threshold for Yjs payload bloat. Above this size the doc is large enough
// that compacting (Y.encodeStateAsUpdateV2 then re-import) should be considered. See
// docs/adr/006-book-yjs-state-size.md.
const YJS_SIZE_WARN_BYTES = 5 * 1024 * 1024;

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
        const sizeBytes = bytes.byteLength;
        if (sizeBytes >= YJS_SIZE_WARN_BYTES) {
            log.warn('book yjs state large', { bookId, sizeBytes, threshold: YJS_SIZE_WARN_BYTES });
        }
        await db.transaction(async (tx) => {
            await tx.insert(bookYjsState).values({ bookId, state: bytes, sizeBytes })
                .onConflictDoUpdate({
                    target: bookYjsState.bookId,
                    set: { state: bytes, sizeBytes, updatedAt: now },
                });
            if (editorId) {
                await tx.update(book).set({ updatedById: editorId, lastEditAt: now, updatedAt: now })
                    .where(eq(book.id, bookId));
            }
        });
    },
});
