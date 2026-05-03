import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book, bookYjsState, bookSnapshot } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth.config';

let app: any;

async function clear() {
    await db.delete(bookSnapshot);
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
    const cs = r.headers['set-cookie'];
    return { cookie: Array.isArray(cs) ? cs.join('; ') : cs };
}

async function seedOwnerAndBook() {
    const owner = await createUser('owner@test.com', { systemRole: 'project_manager' });
    const { cookie } = await signIn('owner@test.com');
    // initialMarkdown non-empty so the book has a Yjs state row — snapshot creation
    // requires it (router returns 409 when nothing has been written yet).
    const r = await request(app).post('/api/books').set('Cookie', cookie)
        .send({ title: 'TestBook', description: '', initialMarkdown: 'hello', initialAssignments: [] }).expect(200);
    return { owner, bookId: r.body.id, cookie };
}

describe('snapshots API', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('1. create snapshot returns summary with createdBy', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const r = await request(app).post(`/api/books/${bookId}/snapshots`).set('Cookie', cookie)
            .send({ label: 'v1.0' }).expect(200);
        expect(r.body.id).toBeDefined();
        expect(r.body.bookId).toBe(bookId);
        expect(r.body.label).toBe('v1.0');
        expect(r.body.createdAt).toBeDefined();
        expect(r.body.createdBy).toBeDefined();
        expect(r.body.createdBy.email).toBe('owner@test.com');
    });

    it('2. list returns the created snapshot', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        await request(app).post(`/api/books/${bookId}/snapshots`).set('Cookie', cookie)
            .send({ label: 'v1.0' }).expect(200);
        const list = await request(app).get(`/api/books/${bookId}/snapshots`).set('Cookie', cookie).expect(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].label).toBe('v1.0');
        expect(list.body[0].createdBy).toBeDefined();
    });

    it('3. state endpoint returns raw bytes (octet-stream)', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/snapshots`).set('Cookie', cookie)
            .send({ label: 'v1.0' }).expect(200);
        const snapId = created.body.id;
        const r = await request(app).get(`/api/books/${bookId}/snapshots/${snapId}/state`).set('Cookie', cookie).expect(200);
        expect(r.headers['content-type']).toContain('application/octet-stream');
    });

    it('4. non-assignee gets 403 on list', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        await createUser('stranger@test.com');
        const { cookie: strangerCookie } = await signIn('stranger@test.com');
        await request(app).get(`/api/books/${bookId}/snapshots`).set('Cookie', strangerCookie).expect(403);
    });

    it('5. non-owner non-admin assignee gets 403 on delete', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/snapshots`).set('Cookie', cookie)
            .send({ label: 'v1.0' }).expect(200);
        const snapId = created.body.id;
        const editor = await createUser('editor@test.com');
        await request(app).post(`/api/books/${bookId}/assignments`).set('Cookie', cookie)
            .send({ userId: editor.id, role: 'editor' }).expect(200);
        const { cookie: editorCookie } = await signIn('editor@test.com');
        await request(app).delete(`/api/books/${bookId}/snapshots/${snapId}`).set('Cookie', editorCookie).expect(403);
    });

    it('6. owner can delete snapshot', async () => {
        const { cookie, bookId } = await seedOwnerAndBook();
        const created = await request(app).post(`/api/books/${bookId}/snapshots`).set('Cookie', cookie)
            .send({ label: 'v1.0' }).expect(200);
        const snapId = created.body.id;
        await request(app).delete(`/api/books/${bookId}/snapshots/${snapId}`).set('Cookie', cookie).expect(204);
        const list = await request(app).get(`/api/books/${bookId}/snapshots`).set('Cookie', cookie).expect(200);
        expect(list.body).toHaveLength(0);
    });
});
