import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

describe('dev auth HTTP gating', () => {
    beforeEach(() => { vi.resetModules(); });
    afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

    it('returns 404 on /api/auth/dev/* when ENABLE_DEV_AUTH=false', async () => {
        vi.stubEnv('ENABLE_DEV_AUTH', 'false');
        const { buildApp } = await import('../src/app');
        const app = await buildApp();
        const users = await request(app).get('/api/auth/dev/users');
        const signin = await request(app).post('/api/auth/dev/sign-in').send({ email: 'x@y.com' });
        expect(users.status).toBe(404);
        expect(signin.status).toBe(404);
    });

    it('mounts /api/auth/dev/* when ENABLE_DEV_AUTH=true', async () => {
        vi.stubEnv('ENABLE_DEV_AUTH', 'true');
        vi.stubEnv('DEV_SEED_PASSWORD', 'devseed1234');
        const { buildApp } = await import('../src/app');
        const app = await buildApp();
        const users = await request(app).get('/api/auth/dev/users');
        expect(users.status).toBe(200);
    });
});
