import express from 'express';
import { env } from './env.js';

const app = express();
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.listen(env.PORT, () => {
    // pino later
    console.log(`backend listening on :${env.PORT}`);
});
