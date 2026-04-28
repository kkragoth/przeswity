import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth';

let app: any;

async function clearDb() {
    await db.delete(assignment);
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

describe('users API', () => {
    beforeAll(async () => {
        app = await buildApp();
        await clearDb();
    });

    afterAll(async () => {
        await clearDb();
        await pool.end();
    });

    it('GET /api/users — 401 without auth', async () => {
        await request(app).get('/api/users').expect(401);
    });

    it('GET /api/users — 403 for non-admin', async () => {
        await createUser('regular@test.com');
        const { cookie } = await signIn('regular@test.com');
        await request(app).get('/api/users').set('Cookie', cookie).expect(403);
    });

    it('GET /api/users — 200 for admin', async () => {
        await createUser('admin1@test.com', { isAdmin: true });
        const { cookie } = await signIn('admin1@test.com');
        const r = await request(app).get('/api/users').set('Cookie', cookie).expect(200);
        expect(Array.isArray(r.body)).toBe(true);
        expect(r.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/me with role counts', async () => {
        await clearDb();
        const u = await createUser('regular2@test.com');
        const [b] = await db.insert(book).values({ title: 'B1', createdById: u.id }).returning();
        await db.insert(assignment).values({ bookId: b.id, userId: u.id, role: 'editor' });
        await db.insert(assignment).values({ bookId: b.id, userId: u.id, role: 'proofreader' });
        const { cookie } = await signIn('regular2@test.com');
        const r = await request(app).get('/api/me').set('Cookie', cookie).expect(200);
        expect(r.body.visibleBookCount).toBe(1);
        expect(r.body.assignmentRoleCounts).toEqual({ editor: 1, proofreader: 1 });
    });

    it('PATCH /api/me — uk → ua locale normalization', async () => {
        const u = await createUser('regular3@test.com');
        const { cookie } = await signIn('regular3@test.com');
        const r = await request(app).patch('/api/me').set('Cookie', cookie).send({ preferredLocale: 'uk-UA' }).expect(200);
        expect(r.body.preferredLocale).toBe('ua');
    });

    it('PATCH /api/me — onboardingDismissedAt now sets ISO timestamp', async () => {
        const u = await createUser('regular4@test.com');
        const { cookie } = await signIn('regular4@test.com');
        const r = await request(app).patch('/api/me').set('Cookie', cookie).send({ onboardingDismissedAt: 'now' }).expect(200);
        expect(r.body.onboardingDismissedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('PATCH /api/me — onboardingDismissedAt null resets', async () => {
        const u = await createUser('regular5@test.com');
        const { cookie } = await signIn('regular5@test.com');
        await request(app).patch('/api/me').set('Cookie', cookie).send({ onboardingDismissedAt: 'now' }).expect(200);
        const r = await request(app).patch('/api/me').set('Cookie', cookie).send({ onboardingDismissedAt: null }).expect(200);
        expect(r.body.onboardingDismissedAt).toBe('');
    });
});
