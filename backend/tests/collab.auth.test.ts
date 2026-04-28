import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { authenticate } from '../src/collab/auth';
import { db, pool } from '../src/db/client';
import { user, book, assignment, bookYjsState } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth';

async function clear() {
    await db.delete(assignment); await db.delete(bookYjsState); await db.delete(book); await db.delete(user);
}
async function makeUser(email: string, opts: { isAdmin?: boolean; isCoordinator?: boolean } = {}) {
    await auth.api.signUpEmail({ body: { email, password: 'devseed1234', name: email.split('@')[0] }, asResponse: true });
    if (opts.isAdmin || opts.isCoordinator) {
        await db.update(user).set({ isAdmin: !!opts.isAdmin, isCoordinator: !!opts.isCoordinator }).where(eq(user.email, email));
    }
    const [u] = await db.select().from(user).where(eq(user.email, email));
    return u;
}
async function signInCookies(email: string) {
    const r = await auth.api.signInEmail({ body: { email, password: 'devseed1234' }, asResponse: true });
    const sets = r.headers.getSetCookie();
    const cookieHeader = sets.map((c) => c.split(';')[0]).join('; ');
    return cookieHeader;
}

describe('collab auth', () => {
    beforeAll(async () => { await clear(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('rejects unauthenticated', async () => {
        await expect(authenticate({ documentName: 'book:abc', requestHeaders: {} })).rejects.toThrow();
    });

    it('admin gets full access on any book', async () => {
        await makeUser('a@test.com', { isAdmin: true });
        const c = await makeUser('c@test.com', { isCoordinator: true });
        const [b] = await db.insert(book).values({ title: 'X', createdById: c.id }).returning();
        const cookie = await signInCookies('a@test.com');
        const ctx = await authenticate({ documentName: `book:${b.id}`, requestHeaders: { cookie } });
        expect(ctx.readOnly).toBe(false);
        expect(ctx.roles).toContain('editor');
    });

    it('owner gets editor', async () => {
        const c = await makeUser('owner@test.com', { isCoordinator: true });
        const [b] = await db.insert(book).values({ title: 'X', createdById: c.id }).returning();
        const cookie = await signInCookies('owner@test.com');
        const ctx = await authenticate({ documentName: `book:${b.id}`, requestHeaders: { cookie } });
        expect(ctx.readOnly).toBe(false);
        expect(ctx.roles).toContain('editor');
    });

    it('proofreader-only: read-write (canSuggest)', async () => {
        const c = await makeUser('coord2@test.com', { isCoordinator: true });
        const u = await makeUser('proof@test.com');
        const [b] = await db.insert(book).values({ title: 'X', createdById: c.id }).returning();
        await db.insert(assignment).values({ bookId: b.id, userId: u.id, role: 'proofreader' });
        const cookie = await signInCookies('proof@test.com');
        const ctx = await authenticate({ documentName: `book:${b.id}`, requestHeaders: { cookie } });
        expect(ctx.readOnly).toBe(false);
        expect(ctx.roles).toEqual(['proofreader']);
    });

    it('global coordinator (not owner, not assigned): rejected', async () => {
        const c1 = await makeUser('owner3@test.com', { isCoordinator: true });
        await makeUser('other_coord@test.com', { isCoordinator: true });
        const [b] = await db.insert(book).values({ title: 'X', createdById: c1.id }).returning();
        const cookie = await signInCookies('other_coord@test.com');
        await expect(authenticate({ documentName: `book:${b.id}`, requestHeaders: { cookie } })).rejects.toThrow();
    });

    it('rejects bad documentName', async () => {
        await makeUser('z@test.com', { isCoordinator: true });
        const cookie = await signInCookies('z@test.com');
        await expect(authenticate({ documentName: 'notabook:abc', requestHeaders: { cookie } })).rejects.toThrow('bad document name');
    });
});
