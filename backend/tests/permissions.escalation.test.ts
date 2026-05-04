import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book, bookYjsState, commentThread, commentMessage } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth.config';
import { BookRole } from '../src/lib/permissions';

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

async function seedBookWithRole(role: BookRole) {
    const owner = await createUser('owner@perm.test', { systemRole: 'project_manager' });
    const member = await createUser('member@perm.test');
    const { cookie: ownerCookie } = await signIn('owner@perm.test');
    const created = await request(app).post('/api/books').set('Cookie', ownerCookie)
        .send({ title: 'PermBook', description: '', initialMarkdown: '', initialAssignments: [{ userId: member.id, role }] }).expect(200);
    const { cookie: memberCookie } = await signIn('member@perm.test');
    return { owner, member, bookId: created.body.id, ownerCookie, memberCookie };
}

async function ownerCreatesThread(bookId: string, ownerCookie: string) {
    const r = await request(app).post(`/api/books/${bookId}/comments`).set('Cookie', ownerCookie)
        .send({ anchorId: 'a', body: 'owner thread' }).expect(200);
    return r.body.id as string;
}

describe('permission escalation matrix', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('translator cannot resolve a thread (403)', async () => {
        const { bookId, ownerCookie, memberCookie } = await seedBookWithRole(BookRole.Translator);
        const threadId = await ownerCreatesThread(bookId, ownerCookie);
        await request(app).post(`/api/comments/${threadId}/resolve`).set('Cookie', memberCookie)
            .send({ resolved: true }).expect(403);
    });

    it('proofreader cannot resolve a thread (403)', async () => {
        const { bookId, ownerCookie, memberCookie } = await seedBookWithRole(BookRole.Proofreader);
        const threadId = await ownerCreatesThread(bookId, ownerCookie);
        await request(app).post(`/api/comments/${threadId}/resolve`).set('Cookie', memberCookie)
            .send({ resolved: true }).expect(403);
    });

    it('proofreader cannot delete an entire thread (403)', async () => {
        const { bookId, ownerCookie, memberCookie } = await seedBookWithRole(BookRole.Proofreader);
        const threadId = await ownerCreatesThread(bookId, ownerCookie);
        await request(app).delete(`/api/comments/${threadId}`).set('Cookie', memberCookie).expect(403);
    });

    it('editor (book role, no system role) cannot delete the book (403)', async () => {
        const { bookId, memberCookie } = await seedBookWithRole(BookRole.Editor);
        await request(app).delete(`/api/books/${bookId}`).set('Cookie', memberCookie).expect(403);
    });

    it('owner (project_manager) cannot delete the book — only admin (403)', async () => {
        const { bookId, ownerCookie } = await seedBookWithRole(BookRole.Editor);
        await request(app).delete(`/api/books/${bookId}`).set('Cookie', ownerCookie).expect(403);
    });

    it('admin can delete any book (204)', async () => {
        const { bookId } = await seedBookWithRole(BookRole.Editor);
        await createUser('boss@perm.test', { systemRole: 'admin' });
        const { cookie: adminCookie } = await signIn('boss@perm.test');
        await request(app).delete(`/api/books/${bookId}`).set('Cookie', adminCookie).expect(204);
    });

    it('translator cannot delete another user\'s message (403); admin can (200)', async () => {
        const { bookId, ownerCookie, memberCookie } = await seedBookWithRole(BookRole.Translator);
        const threadId = await ownerCreatesThread(bookId, ownerCookie);
        const [msg] = await db.select().from(commentMessage).where(eq(commentMessage.threadId, threadId));
        await request(app).delete(`/api/comments/${threadId}/messages/${msg.id}`).set('Cookie', memberCookie).expect(403);

        await createUser('boss2@perm.test', { systemRole: 'admin' });
        const { cookie: adminCookie } = await signIn('boss2@perm.test');
        await request(app).delete(`/api/comments/${threadId}/messages/${msg.id}`).set('Cookie', adminCookie).expect(200);
    });

    it('non-member cannot read book comments (403)', async () => {
        const { bookId } = await seedBookWithRole(BookRole.Editor);
        await createUser('outsider@perm.test');
        const { cookie } = await signIn('outsider@perm.test');
        await request(app).get(`/api/books/${bookId}/comments`).set('Cookie', cookie).expect(403);
    });
});
