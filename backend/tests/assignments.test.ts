import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book, bookYjsState } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth.config';

let app: any;

async function clear() {
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

async function seedCoordAndBook() {
    const c = await createUser('coord@test.com', { systemRole: 'project_manager' });
    const u1 = await createUser('e1@test.com');
    const u2 = await createUser('e2@test.com');
    const { cookie } = await signIn('coord@test.com');
    const r = await request(app).post('/api/books').set('Cookie', cookie)
        .send({ title: 'B', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
    return { coord: c, u1, u2, bookId: r.body.id, cookie };
}

describe('assignments API', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('bulk: created vs existing partition', async () => {
        const { u1, u2, bookId, cookie } = await seedCoordAndBook();
        const r1 = await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }] }).expect(200);
        expect(r1.body.created).toHaveLength(1);
        expect(r1.body.existing).toHaveLength(0);

        const r2 = await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }, { userId: u2.id, role: 'proofreader' }] }).expect(200);
        expect(r2.body.created).toHaveLength(1);
        expect(r2.body.existing).toHaveLength(1);
        expect(r2.body.assignments).toHaveLength(2);
    });

    it('bulk: unknown userId → 422 (transaction never opened)', async () => {
        const { bookId, cookie } = await seedCoordAndBook();
        const r = await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: 'doesnotexist', role: 'editor' }] }).expect(422);
        expect(r.body.error.code).toBe('errors.assignment.unknownUsers');
        expect(r.body.error.unknownUserIds).toContain('doesnotexist');
    });

    it('bulk: duplicate in payload collapses to one', async () => {
        const { u1, bookId, cookie } = await seedCoordAndBook();
        const r = await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }, { userId: u1.id, role: 'editor' }] }).expect(200);
        expect(r.body.created).toHaveLength(1);
    });

    it('bulk: non-owner → 403', async () => {
        const { u1, bookId } = await seedCoordAndBook();
        const { cookie } = await signIn('e1@test.com');
        await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }] }).expect(403);
    });

    it('admin can manage any book', async () => {
        const { u1, bookId } = await seedCoordAndBook();
        await createUser('admin@test.com', { systemRole: 'admin' });
        const { cookie } = await signIn('admin@test.com');
        await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }] }).expect(200);
    });

    it('list visible to assignee, not random', async () => {
        const { u1, bookId, cookie: ccoord } = await seedCoordAndBook();
        await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', ccoord)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }] }).expect(200);
        const { cookie: c1 } = await signIn('e1@test.com');
        await request(app).get(`/api/books/${bookId}/assignments`).set('Cookie', c1).expect(200);
        await createUser('rando@test.com');
        const { cookie: cr } = await signIn('rando@test.com');
        await request(app).get(`/api/books/${bookId}/assignments`).set('Cookie', cr).expect(403);
    });

    it('DELETE removes single role; same user retains other roles', async () => {
        const { u1, bookId, cookie } = await seedCoordAndBook();
        await request(app).post(`/api/books/${bookId}/assignments/bulk`).set('Cookie', cookie)
            .send({ assignments: [{ userId: u1.id, role: 'editor' }, { userId: u1.id, role: 'proofreader' }] }).expect(200);
        await request(app).delete(`/api/books/${bookId}/assignments/${u1.id}/editor`).set('Cookie', cookie).expect(204);
        const r = await request(app).get(`/api/books/${bookId}/assignments`).set('Cookie', cookie).expect(200);
        expect(r.body).toHaveLength(1);
        expect(r.body[0].role).toBe('proofreader');
    });
});
