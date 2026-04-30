import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authenticate } from '../src/collab/auth';
import { db, pool } from '../src/db/client';
import { user, book, assignment, bookYjsState } from '../src/db/schema';
import { env } from '../src/env';

async function clear() {
    await db.delete(assignment); await db.delete(bookYjsState); await db.delete(book); await db.delete(user);
}

describe('collab dev anon fallback', () => {
    beforeAll(async () => { await clear(); });
    afterAll(async () => { await clear(); await pool.end(); });

    it('rejects unauthenticated WS handshake when ENABLE_DEV_AUTH is false', async () => {
        const original = env.ENABLE_DEV_AUTH;
        (env as { ENABLE_DEV_AUTH: boolean }).ENABLE_DEV_AUTH = false;
        try {
            // Insert a real book so the auth function reaches the unauthenticated branch.
            await db.insert(user).values({ id: 'sys-1', email: 'sys@test.com', name: 'sys', emailVerified: false, isSystem: true });
            const [b] = await db.insert(book).values({ title: 'X', createdById: 'sys-1' }).returning();
            await expect(
                authenticate({ documentName: `book:${b.id}`, requestHeaders: {} }),
            ).rejects.toThrow('unauthenticated');
        } finally {
            (env as { ENABLE_DEV_AUTH: boolean }).ENABLE_DEV_AUTH = original;
        }
    });
});
