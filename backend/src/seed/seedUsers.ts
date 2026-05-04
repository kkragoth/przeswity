import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { user } from '../db/schema.js';
import { auth } from '../auth/betterAuth.config.js';
import { log } from '../lib/log.js';
import { getDevSeedPassword } from './devPassword.js';
import { USERS } from './data/users.js';
import type { SeedUser } from './data/types.js';

async function upsertSeedUser(spec: SeedUser): Promise<void> {
    try {
        await auth.api.signUpEmail({ body: { email: spec.email, password: getDevSeedPassword(), name: spec.name }, asResponse: true });
    } catch (e: unknown) {
        const code = (e as { body?: { code?: string }; cause?: { code?: string } })?.body?.code
            ?? (e as { cause?: { code?: string } })?.cause?.code
            ?? '';
        const msg = e instanceof Error ? e.message : '';
        if (code !== 'USER_ALREADY_EXISTS' && !msg.toUpperCase().includes('ALREADY')) {
            log.warn('seed signUpEmail failed', { email: spec.email, code: code || msg });
        }
    }
    await db.update(user).set({
        name: spec.name,
        systemRole: spec.systemRole,
        competencyTags: spec.tags,
        color: spec.color,
        preferredLocale: 'pl',
    }).where(eq(user.email, spec.email));
}

export async function seedUsers(): Promise<{ idByEmail: Map<string, string>; userByEmail: Map<string, SeedUser> }> {
    for (const u of USERS) {
        await upsertSeedUser(u);
        log.info('seed user upserted', { email: u.email });
    }
    const allUsers = await db.select().from(user);
    return {
        idByEmail: new Map(allUsers.map((u) => [u.email, u.id])),
        userByEmail: new Map(USERS.map((u) => [u.email, u])),
    };
}
