import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/betterAuth.js';
import { devAuthRouter, devAuthEnabled } from './auth/devSignIn.js';
import { docsRouter } from './openapi/docs.js';
import { env } from './env.js';

export async function buildApp() {
    const app = express();
    app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
    app.use(cookieParser());

    // Dev quick-login mounted FIRST so its /api/auth/dev/* doesn't get swallowed by BetterAuth's wildcard.
    app.use(devAuthRouter);

    // BetterAuth wildcard handler must run BEFORE express.json() globally — it parses its own bodies.
    app.all('/api/auth/*', toNodeHandler(auth));

    app.use(express.json());
    app.use(docsRouter);

    app.get('/healthz', (_req, res) => res.json({ ok: true }));

    return app;
}

export { devAuthEnabled };
