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
    const cs = r.headers['set-cookie'];
    return { cookie: Array.isArray(cs) ? cs.join('; ') : cs };
}

// Fixture: a book with three threads:
//   t1 (ownerCookie, no mentions, ACTIVE)
//   t2 (memberCookie, mentions roles=[editor], DETACHED)
//   t3 (memberCookie, mentions userIds=[owner], RESOLVED)
async function seed() {
    const owner = await createUser('owner@filt.test', { systemRole: 'project_manager' });
    const member = await createUser('member@filt.test');
    const { cookie: ownerCookie } = await signIn('owner@filt.test');
    const created = await request(app).post('/api/books').set('Cookie', ownerCookie)
        .send({ title: 'F', description: '', initialMarkdown: '', initialAssignments: [{ userId: member.id, role: 'editor' }] }).expect(200);
    const bookId = created.body.id;
    const { cookie: memberCookie } = await signIn('member@filt.test');

    const t1 = (await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', ownerCookie)
        .send({ anchorId: 'a1', body: 'plain' }).expect(200)).body.id;
    const t2 = (await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', memberCookie)
        .send({ anchorId: 'a2', body: 'role mention', mentions: { userIds: [], roles: ['editor'] } }).expect(200)).body.id;
    const t3 = (await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', memberCookie)
        .send({ anchorId: 'a3', body: 'user mention', mentions: { userIds: [owner.id], roles: [] } }).expect(200)).body.id;

    await request(app).patch(`/api/comments/${t2}/detach`).set('Cookie', ownerCookie).expect(200);
    await request(app).post(`/api/comments/${t3}/resolve`).set('Cookie', ownerCookie).send({ resolved: true }).expect(200);

    return { owner, member, bookId, ownerCookie, memberCookie, t1, t2, t3 };
}

const idsOf = (body: { id: string }[]) => body.map((t) => t.id).sort();

describe('comments list filters cross-product', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('status=active returns only the active thread', async () => {
        const { ownerCookie, bookId, t1 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=active`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t1].sort());
    });

    it('status=resolved returns only the resolved thread', async () => {
        const { ownerCookie, bookId, t3 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=resolved`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t3].sort());
    });

    it('status=detached returns only the detached thread', async () => {
        const { ownerCookie, bookId, t2 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=detached`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t2].sort());
    });

    it('status=all returns every thread', async () => {
        const { ownerCookie, bookId, t1, t2, t3 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=all`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t1, t2, t3].sort());
    });

    it('author=member with status=all returns t2+t3 (member-authored)', async () => {
        const { ownerCookie, bookId, member, t2, t3 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=all&author=${member.id}`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t2, t3].sort());
    });

    it('mentionsRole=editor with status=all returns only t2', async () => {
        const { ownerCookie, bookId, t2 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=all&mentionsRole=editor`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t2].sort());
    });

    it('mentionsMe (as owner) with status=all returns only t3 (mentioned by id)', async () => {
        const { ownerCookie, bookId, t3 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=all&mentionsMe=true`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t3].sort());
    });

    it('mentionsMe (as member, role=editor) with status=all returns only t2 (mentioned by role)', async () => {
        const { memberCookie, bookId, t2 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=all&mentionsMe=true`).set('Cookie', memberCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t2].sort());
    });

    it('cross filter: author=member + status=resolved → only t3', async () => {
        const { ownerCookie, bookId, member, t3 } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=resolved&author=${member.id}`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([t3].sort());
    });

    it('cross filter: mentionsRole=editor + status=active → empty (t2 is detached)', async () => {
        const { ownerCookie, bookId } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=active&mentionsRole=editor`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([]);
    });

    it('cross filter: mentionsMe=true (owner) + status=active → empty (t3 is resolved)', async () => {
        const { ownerCookie, bookId } = await seed();
        const r = await request(app).get(`/api/books/${bookId}/comments?status=active&mentionsMe=true`).set('Cookie', ownerCookie).expect(200);
        expect(idsOf(r.body)).toEqual([]);
    });
});
