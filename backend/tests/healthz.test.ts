import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('healthz', () => {
    it('returns ok', async () => {
        const app = express();
        app.get('/healthz', (_req, res) => res.json({ ok: true }));
        const r = await request(app).get('/healthz');
        expect(r.status).toBe(200);
        expect(r.body).toEqual({ ok: true });
    });
});
