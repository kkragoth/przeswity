import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { user, assignment, book, bookYjsState } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../src/auth/betterAuth';

let app: any;
async function clear() { await db.delete(assignment); await db.delete(bookYjsState); await db.delete(book); await db.delete(user); }
async function createUser(email: string) {
    await auth.api.signUpEmail({ body: { email, password: 'devseed1234', name: email.split('@')[0] }, asResponse: true });
    const [u] = await db.select().from(user).where(eq(user.email, email));
    return u;
}
async function signIn(email: string) {
    const r = await request(app).post('/api/auth/sign-in/email').send({ email, password: 'devseed1234' });
    const cs = r.headers['set-cookie'];
    return { cookie: Array.isArray(cs) ? cs.join('; ') : cs };
}

describe('PDF extract stub', () => {
    beforeAll(async () => { app = await buildApp(); });
    afterAll(async () => { await clear(); await pool.end(); });
    beforeEach(async () => { await clear(); });

    it('400 when no file', async () => {
        await createUser('pdf@test.com');
        const { cookie } = await signIn('pdf@test.com');
        await request(app).post('/api/pdf/extract').set('Cookie', cookie).expect(400);
    });
});
