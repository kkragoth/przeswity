import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/betterAuth.js';
import { devAuthRouter, devAuthEnabled } from './auth/devSignIn.js';
import { env } from './env.js';

const app = express();
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(cookieParser());

// Dev quick-login MUST mount before BetterAuth's /api/auth/* wildcard so
// /api/auth/dev/* doesn't get swallowed. The router scopes its own JSON parser.
app.use(devAuthRouter);

// BetterAuth handles every /api/auth/* itself; mount BEFORE express.json — it parses its own bodies.
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ ok: true }));

console.log(`dev-auth: ${devAuthEnabled ? 'enabled' : 'disabled'}`);

app.listen(env.PORT, () => {
    console.log(`backend listening on :${env.PORT}`);
});
