import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book, bookYjsState } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth';

let app: any;

async function clear() {
    await db.delete(assignment);
    await db.delete(bookYjsState);
    await db.delete(book);
    await db.delete(user);
}

async function createUser(email: string, opts: { isAdmin?: boolean; isCoordinator?: boolean } = {}) {
    await auth.api.signUpEmail({ body: { email, password: 'devseed1234', name: email.split('@')[0] }, asResponse: true });
    if (opts.isAdmin || opts.isCoordinator) {
        await db.update(user).set({ isAdmin: !!opts.isAdmin, isCoordinator: !!opts.isCoordinator }).where(eq(user.email, email));
    }
    const [u] = await db.select().from(user).where(eq(user.email, email));
    return u;
}

async function signIn(email: string) {
    const r = await request(app).post('/api/auth/sign-in/email').send({ email, password: 'devseed1234' });
    const cookies = r.headers['set-cookie'];
    return { cookie: Array.isArray(cookies) ? cookies.join('; ') : cookies };
}

describe('books API', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('coordinator creates a book with initialMarkdown -> YDoc populated', async () => {
        await createUser('coord1@test.com', { isCoordinator: true });
        const { cookie } = await signIn('coord1@test.com');
        const md = '# Title\n\nFirst paragraph.\n\n## Sub\n\n* item one\n* item two\n';
        const r = await request(app).post('/api/books').set('Cookie', cookie)
            .send({ title: 'B1', description: 'd', initialMarkdown: md, initialAssignments: [] }).expect(200);
        expect(r.body.title).toBe('B1');
        const bookId = r.body.id;
        const [yState] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
        expect(yState).toBeDefined();
        expect(yState.state.length).toBeGreaterThan(0);

        const md2 = await request(app).get(`/api/books/${bookId}/markdown`).set('Cookie', cookie).expect(200);
        expect(md2.text).toContain('# Title');
        expect(md2.text).toContain('First paragraph.');
    });

    it('non-coordinator cannot POST /api/books', async () => {
        await createUser('reg@test.com');
        const { cookie } = await signIn('reg@test.com');
        await request(app).post('/api/books').set('Cookie', cookie)
            .send({ title: 'X', description: '', initialMarkdown: '', initialAssignments: [] }).expect(403);
    });

    it('contributor only sees books they are assigned to', async () => {
        await createUser('coord2@test.com', { isCoordinator: true });
        const u = await createUser('contrib@test.com');
        const { cookie: ccoord } = await signIn('coord2@test.com');
        await request(app).post('/api/books').set('Cookie', ccoord)
            .send({ title: 'B-mine', description: '', initialMarkdown: '', initialAssignments: [{ userId: u.id, role: 'editor' }] }).expect(200);
        await request(app).post('/api/books').set('Cookie', ccoord)
            .send({ title: 'B-other', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);

        const { cookie: ccontrib } = await signIn('contrib@test.com');
        const r = await request(app).get('/api/books').set('Cookie', ccontrib).expect(200);
        expect(r.body.length).toBe(1);
        expect(r.body[0].title).toBe('B-mine');
        expect(r.body[0].myRoles).toEqual(['editor']);
        expect(r.body[0].assigneeCount).toBe(1);
    });

    it('admin sees all books', async () => {
        await createUser('coord3@test.com', { isCoordinator: true });
        await createUser('admin1@test.com', { isAdmin: true });
        const { cookie: ccoord } = await signIn('coord3@test.com');
        await request(app).post('/api/books').set('Cookie', ccoord).send({ title: 'X', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
        await request(app).post('/api/books').set('Cookie', ccoord).send({ title: 'Y', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
        const { cookie: cadmin } = await signIn('admin1@test.com');
        const r = await request(app).get('/api/books').set('Cookie', cadmin).expect(200);
        expect(r.body.length).toBe(2);
    });

    it('returns 422 when initialAssignments references unknown userId', async () => {
        await createUser('coord4@test.com', { isCoordinator: true });
        const { cookie } = await signIn('coord4@test.com');
        const r = await request(app).post('/api/books').set('Cookie', cookie).send({
            title: 'B', description: '', initialMarkdown: '',
            initialAssignments: [{ userId: 'nonexistent-id', role: 'editor' }],
        }).expect(422);
        expect(r.body.error.code).toBe('errors.assignment.unknownUsers');
    });

    it('coordinator can patch stage and reads stage history', async () => {
        await createUser('coord-stage@test.com', { isCoordinator: true });
        const { cookie } = await signIn('coord-stage@test.com');
        const created = await request(app).post('/api/books').set('Cookie', cookie)
            .send({ title: 'workflow', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
        const bookId = created.body.id;

        const patched = await request(app).patch(`/api/books/${bookId}/stage`).set('Cookie', cookie).send({
            stage: 'authorization',
            note: 'Ready for author review',
        }).expect(200);
        expect(patched.body.stage).toBe('authorization');
        expect(patched.body.stageNote).toBe('Ready for author review');

        const history = await request(app).get(`/api/books/${bookId}/stage-history`).set('Cookie', cookie).expect(200);
        expect(history.body.length).toBe(2);
        expect(history.body[0].fromStage).toBe(null);
        expect(history.body[0].toStage).toBe('editing');
        expect(history.body[1].fromStage).toBe('editing');
        expect(history.body[1].toStage).toBe('authorization');
    });

    it('rejects illegal stage transitions', async () => {
        await createUser('coord-illegal@test.com', { isCoordinator: true });
        const { cookie } = await signIn('coord-illegal@test.com');
        const created = await request(app).post('/api/books').set('Cookie', cookie)
            .send({ title: 'workflow', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
        const bookId = created.body.id;
        await request(app).patch(`/api/books/${bookId}/stage`).set('Cookie', cookie).send({
            stage: 'finalization',
        }).expect(422);
    });

    it('coordinator can patch progress; invalid progress rejected', async () => {
        await createUser('coord-progress@test.com', { isCoordinator: true });
        const { cookie } = await signIn('coord-progress@test.com');
        const created = await request(app).post('/api/books').set('Cookie', cookie)
            .send({ title: 'workflow', description: '', initialMarkdown: '', initialAssignments: [] }).expect(200);
        const bookId = created.body.id;

        const patched = await request(app).patch(`/api/books/${bookId}/progress`).set('Cookie', cookie).send({
            progress: 55,
            mode: 'manual',
        }).expect(200);
        expect(patched.body.progress).toBe(55);
        expect(patched.body.progressMode).toBe('manual');

        await request(app).patch(`/api/books/${bookId}/progress`).set('Cookie', cookie).send({
            progress: 101,
            mode: 'manual',
        }).expect(400);
    });
});
