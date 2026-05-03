import express, { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from './betterAuth.config.js';
import { db } from '../db/client.js';
import { user } from '../db/auth-schema.js';
import { env } from '../env.js';
import { getDevSeedPassword } from '../seed/devPassword.js';

const DevSignInBody = z
    .object({ userId: z.string().optional(), email: z.string().email().optional() })
    .refine((b) => !!(b.userId || b.email), { message: 'userId or email required' });

// env.ts.superRefine guarantees ENABLE_DEV_AUTH=false when NODE_ENV=production. The
// trailing NODE_ENV check is defence in depth — if the env validation is ever weakened,
// dev-auth must still refuse to mount in prod.
export const devAuthEnabled = env.ENABLE_DEV_AUTH && env.NODE_ENV !== 'production';

export const devAuthRouter = Router();

if (devAuthEnabled) {
    devAuthRouter.use('/api/auth/dev', express.json());

    devAuthRouter.get('/api/auth/dev/users', async (_req: Request, res: Response) => {
        const rows = await db
            .select({
                id: user.id,
                email: user.email,
                name: user.name,
                color: user.color,
                systemRole: user.systemRole,
                competencyTags: user.competencyTags,
                preferredLocale: user.preferredLocale,
            })
            .from(user)
            .where(eq(user.isSystem, false));
        res.json(rows);
    });

    devAuthRouter.post('/api/auth/dev/sign-in', async (req: Request, res: Response) => {
        const parsed = DevSignInBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: { code: 'errors.validation', message: parsed.error.message, issues: parsed.error.issues } });
            return;
        }
        const body = parsed.data;
        let email = body.email;
        if (!email && body.userId) {
            const found = await db.select({ email: user.email }).from(user).where(eq(user.id, body.userId)).limit(1);
            email = found[0]?.email;
        }
        if (!email) {
            res.status(404).json({ error: { code: 'errors.user.notFound', message: 'user not found' } });
            return;
        }
        const result = await auth.api.signInEmail({
            body: { email, password: getDevSeedPassword() },
            asResponse: true,
        });
        const setCookie = result.headers.get('set-cookie');
        if (setCookie) res.setHeader('set-cookie', setCookie);
        res.status(result.status).send(await result.text());
    });
}
