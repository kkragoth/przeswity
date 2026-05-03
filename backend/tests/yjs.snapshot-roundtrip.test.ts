import { describe, it, expect, afterAll } from 'vitest';
import * as Y from 'yjs';
import { db, pool } from '../src/db/client';
import { book, bookYjsState, user } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { asByteaInput } from '../src/lib/bytes';

// Simulates a write → DB read → applyUpdate cycle. Important to catch any future
// regression in the `bytea` round-trip (#18) or in compression once we land it (#42).
describe('yjs snapshot roundtrip', () => {
    afterAll(async () => { await pool.end(); });

    it('write → read → applyUpdate yields identical state', async () => {
        await db.insert(user).values({ id: 'sys-yjs', email: 'sys-yjs@test.com', name: 'sys', emailVerified: false, isSystem: true })
            .onConflictDoNothing();
        const [b] = await db.insert(book).values({ title: 'roundtrip', createdById: 'sys-yjs' }).returning();
        try {
            const doc = new Y.Doc();
            doc.getText('t').insert(0, 'hello world');
            const update = Y.encodeStateAsUpdate(doc);

            const bytes = asByteaInput(update);
            await db.insert(bookYjsState).values({ bookId: b.id, state: bytes, sizeBytes: bytes.byteLength });

            const [row] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, b.id));
            expect(row.sizeBytes).toBe(bytes.byteLength);

            const restored = new Y.Doc();
            Y.applyUpdate(restored, new Uint8Array(row.state));
            expect(restored.getText('t').toString()).toBe('hello world');
        } finally {
            await db.delete(bookYjsState).where(eq(bookYjsState.bookId, b.id));
            await db.delete(book).where(eq(book.id, b.id));
        }
    });
});
