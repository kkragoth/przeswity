import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';

describe('rate limit headers', () => {
    afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

    it('emits RateLimit-* headers when not in test env', async () => {
        // Vitest sets NODE_ENV=test; the limiters are gated to non-test. Force production
        // (still safe — env.superRefine permits it as long as ENABLE_DEV_AUTH=false).
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('ENABLE_DEV_AUTH', 'false');
        vi.resetModules();
        const { buildApp } = await import('../src/app');
        const app = await buildApp();
        const r = await request(app).get('/healthz');
        expect(r.status).toBe(200);
        // express-rate-limit standardHeaders emits RateLimit-Limit + RateLimit-Remaining.
        expect(r.headers['ratelimit-limit']).toBeDefined();
        expect(r.headers['ratelimit-remaining']).toBeDefined();
    });
});
