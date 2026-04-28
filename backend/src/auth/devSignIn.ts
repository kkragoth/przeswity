import express, { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { auth } from './betterAuth.js';
import { db } from '../db/client.js';
import { user } from '../db/auth-schema.js';
import { env } from '../env.js';
import { DEV_PASSWORD } from '../seed/devPassword.js';

export const devAuthEnabled = env.ENABLE_DEV_AUTH && env.NODE_ENV !== 'production';

if (env.NODE_ENV === 'production' && env.ENABLE_DEV_AUTH) {
    throw new Error('ENABLE_DEV_AUTH must be false when NODE_ENV=production');
}

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
        const body = req.body as { userId?: string; email?: string };
        let email = body.email;
        if (!email && body.userId) {
            const found = await db.select({ email: user.email }).from(user).where(eq(user.id, body.userId)).limit(1);
            email = found[0]?.email;
        }
        if (!email) {
            res.status(400).json({ error: { code: 'errors.validation', message: 'userId or email required' } });
            return;
        }
        const result = await auth.api.signInEmail({
            body: { email, password: DEV_PASSWORD },
            asResponse: true,
        });
        const setCookie = result.headers.get('set-cookie');
        if (setCookie) res.setHeader('set-cookie', setCookie);
        res.status(result.status).send(await result.text());
    });
}
