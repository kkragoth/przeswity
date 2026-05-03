import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book, bookYjsState, commentThread, commentMessage } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth.config';

let app: any;

async function clear() {
    await db.delete(commentMessage);
    await db.delete(commentThread);
    await db.delete(assignment);
    await db.delete(bookYjsState);
    await db.delete(book);
    await db.delete(user);
}

async function createUser(email: string, opts: { systemRole?: 'admin' | 'project_manager' } = {}) {
    await auth.api.signUpEmail({ body: { email, password: 'devseed1234', name: email.split('@')[0] }, asResponse: true });
    if (opts.systemRole) {
        await db.update(user).set({ systemRole: opts.systemRole }).where(eq(user.email, email));
    }
    const [u] = await db.select().from(user).where(eq(user.email, email));
    return u;
}

async function signIn(email: string) {
    const r = await request(app).post('/api/auth/sign-in/email').send({ email, password: 'devseed1234' });
    const cookies = r.headers['set-cookie'];
    return { cookie: Array.isArray(cookies) ? cookies.join('; ') : cookies };
}

async function seedOwnerAndBook() {
    const owner = await createUser('owner@test.com', { systemRole: 'project_manager' });
    const { cookie } = await signIn('owner@test.com');
    const r = await request(app).post('/api/books').set('Cookie', cookie)
        .send({ title: 'TestBook', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
    return { owner, bookId: r.body.id, cookie };
}

describe('comments API', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('1. owner creates thread → list returns 1 active thread with 1 message', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const r = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'anchor1', quote: 'some quote', body: 'First comment' }).expect(200);
        expect(r.body.anchorId).toBe('anchor1');
        expect(r.body.messages).toHaveLength(1);
        expect(r.body.messages[0].body).toBe('First comment');

        const list = await request(app).get(`/api/books/${bookId}/comments`).set('Cookie', cookie).expect(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].messages).toHaveLength(1);
        expect(list.body[0].resolved).toBe(false);
        expect(list.body[0].detachedAt).toBeNull();
    });

    it('2. reply adds a message; list returns thread with 2 messages in order', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'anchor1', body: 'First' }).expect(200);
        const threadId = created.body.id;

        const replied = await request(app).post(`/api/comments/${threadId}/messages`).set('Cookie', cookie)
            .send({ body: 'Reply here' }).expect(200);
        expect(replied.body.messages).toHaveLength(2);
        expect(replied.body.messages[0].body).toBe('First');
        expect(replied.body.messages[1].body).toBe('Reply here');
    });

    it('3. edit own message: 200, sets editedAt', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a', body: 'Original' }).expect(200);
        const threadId = created.body.id;
        const msgId = created.body.messages[0].id;

        const edited = await request(app).patch(`/api/comments/${threadId}/messages/${msgId}`)
            .set('Cookie', cookie).send({ body: 'Edited' }).expect(200);
        expect(edited.body.messages[0].body).toBe('Edited');
        expect(edited.body.messages[0].editedAt).not.toBeNull();
    });

    it('4. edit someone else\'s message: 403', async () => {
        const { cookie, bookId, owner } = await seedOwnerAndBook();
        const other = await createUser('other@test.com');
        // Assign other to book so they have read access
        await request(app).post(`/api/books/${bookId}/assignments`).set('Cookie', cookie)
            .send({ userId: other.id, role: 'editor' }).expect(200);
        const { cookie: otherCookie } = await signIn('other@test.com');

        const created = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a', body: 'Owner msg' }).expect(200);
        const threadId = created.body.id;
        const msgId = created.body.messages[0].id;

        await request(app).patch(`/api/comments/${threadId}/messages/${msgId}`)
            .set('Cookie', otherCookie).send({ body: 'Hijacked' }).expect(403);
    });

    it('5. resolve thread: status=resolved returns it; status=active does not', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a', body: 'msg' }).expect(200);
        const threadId = created.body.id;

        await request(app).post(`/api/comments/${threadId}/resolve`).set('Cookie', cookie)
            .send({ resolved: true }).expect(200);

        const active = await request(app).get(`/api/books/${bookId}/comments?status=active`).set('Cookie', cookie).expect(200);
        expect(active.body).toHaveLength(0);

        const resolved = await request(app).get(`/api/books/${bookId}/comments?status=resolved`).set('Cookie', cookie).expect(200);
        expect(resolved.body).toHaveLength(1);
        expect(resolved.body[0].resolved).toBe(true);
    });

    it('6. delete the only message → thread is deleted', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a', body: 'msg' }).expect(200);
        const threadId = created.body.id;
        const msgId = created.body.messages[0].id;

        const del = await request(app).delete(`/api/comments/${threadId}/messages/${msgId}`)
            .set('Cookie', cookie).expect(200);
        expect(del.body.threadDeleted).toBe(true);

        const list = await request(app).get(`/api/books/${bookId}/comments?status=all`).set('Cookie', cookie).expect(200);
        expect(list.body).toHaveLength(0);
    });

    it('7. detach + reattach idempotent: 5 concurrent detach POSTs return same detachedAt', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a', body: 'msg' }).expect(200);
        const threadId = created.body.id;

        // 5 concurrent detach calls
        const results = await Promise.all(
            Array.from({ length: 5 }, () =>
                request(app).patch(`/api/comments/${threadId}/detach`).set('Cookie', cookie).expect(200),
            ),
        );
        const detachedAts = results.map((r) => r.body.detachedAt);
        // All should return the same non-null value (idempotent)
        expect(detachedAts[0]).not.toBeNull();
        expect(new Set(detachedAts).size).toBe(1);

        // Reattach
        const reattached = await request(app).patch(`/api/comments/${threadId}/reattach`).set('Cookie', cookie).expect(200);
        expect(reattached.body.detachedAt).toBeNull();
    });

    it('8. ?author=<id> filter', async () => {
        const { cookie, bookId, owner } = await seedOwnerAndBook();
        const other = await createUser('other2@test.com');
        await request(app).post(`/api/books/${bookId}/assignments`).set('Cookie', cookie)
            .send({ userId: other.id, role: 'editor' }).expect(200);
        const { cookie: otherCookie } = await signIn('other2@test.com');

        await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a1', body: 'owner comment' }).expect(200);
        await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', otherCookie)
            .send({ anchorId: 'a2', body: 'other comment' }).expect(200);

        const filtered = await request(app)
            .get(`/api/books/${bookId}/comments?author=${other.id}`)
            .set('Cookie', cookie).expect(200);
        expect(filtered.body).toHaveLength(1);
        expect(filtered.body[0].messages[0].authorId).toBe(other.id);
    });

    it('9. ?mentionsRole=editor filter', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a1', body: 'no mention' }).expect(200);
        await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a2', body: 'mentions editor', mentions: { userIds: [], roles: ['editor'] } }).expect(200);

        const filtered = await request(app)
            .get(`/api/books/${bookId}/comments?mentionsRole=editor`)
            .set('Cookie', cookie).expect(200);
        expect(filtered.body).toHaveLength(1);
        expect(filtered.body[0].messages[0].mentions.roles).toContain('editor');
    });

    it('10. ?mentionsMe=true filter (user mentioned by id)', async () => {
        const { cookie, bookId, owner } = await seedOwnerAndBook();
        const other = await createUser('other3@test.com');
        await request(app).post(`/api/books/${bookId}/assignments`).set('Cookie', cookie)
            .send({ userId: other.id, role: 'proofreader' }).expect(200);
        const { cookie: otherCookie } = await signIn('other3@test.com');

        // Thread 1: mentions other by userId
        await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a1', body: 'mention by id', mentions: { userIds: [other.id], roles: [] } }).expect(200);
        // Thread 2: no mention
        await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', cookie)
            .send({ anchorId: 'a2', body: 'no mention' }).expect(200);

        const filtered = await request(app)
            .get(`/api/books/${bookId}/comments?mentionsMe=true`)
            .set('Cookie', otherCookie).expect(200);
        expect(filtered.body).toHaveLength(1);
        expect(filtered.body[0].messages[0].mentions.userIds).toContain(other.id);
    });
});
