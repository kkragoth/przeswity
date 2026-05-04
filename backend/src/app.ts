import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/betterAuth.config.js';
import { devAuthRouter, devAuthEnabled } from './auth/devSignIn.js';
import { docsRouter } from './openapi/docs.js';
import { usersRouter } from './modules/users/router.js';
import { booksRouter } from './modules/books/router.js';
import { assignmentsRouter } from './modules/assignments/router.js';
import { commentsRouter } from './modules/comments/router.js';
import { versionsRouter } from './modules/versions/router.js';
import { aiRouter } from './modules/ai/router.js';
import { pdfRouter } from './modules/pdf/router.js';
import { errorMiddleware } from './lib/errors.js';
import { authLimiter, pdfLimiter, defaultLimiter } from './lib/rateLimits.js';
import { env } from './env.js';

export async function buildApp() {
    const app = express();
    app.disable('x-powered-by');
    // CSP turned off — frontend serves its own CSP headers via its hosting layer.
    // Skip compression (reverse proxy handles it) and hpp (no array-style query parsing).
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
    app.use(cookieParser());

    // Default rate limit covers everything that follows. Strict per-route limiters wrap
    // sensitive paths (auth, pdf, ai) below.
    if (env.NODE_ENV !== 'test') {
        app.use(defaultLimiter);
    }

    // Dev quick-login mounted before authLimiter so React StrictMode + HMR re-fetches
    // don't trip the 5/min auth budget. Also kept above BetterAuth's /api/auth/* wildcard.
    app.use(devAuthRouter);

    if (env.NODE_ENV !== 'test') {
        app.use('/api/auth', authLimiter);
    }

    // BetterAuth wildcard handler must run BEFORE express.json() globally — it parses its own bodies.
    app.all('/api/auth/*', toNodeHandler(auth));

    app.use(express.json());
    app.use(docsRouter);
    app.use(usersRouter);
    app.use(booksRouter);
    app.use(assignmentsRouter);
    app.use(commentsRouter);
    app.use(versionsRouter);
    app.use(aiRouter);
    if (env.NODE_ENV !== 'test') {
        app.use('/api/pdf', pdfLimiter);
        app.use('/api/ai', authLimiter);
    }
    app.use(pdfRouter);

    app.get('/healthz', (_req, res) => res.json({ ok: true }));

    app.use(errorMiddleware);

    return app;
}

export { devAuthEnabled };
